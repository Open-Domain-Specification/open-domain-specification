#!/usr/bin/env node
// Validates ODS workspace JSON files as one set.
// Usage: node validate.mjs .ods                     (a folder: every .json under it but schema.json)
//        node validate.mjs .ods/a.json .ods/b.json  (files: one set, rooted at their common folder)
// A single file is judged on its own: a ref it writes into another file reports
// `unresolved-ref` ("no such file"), because there is no set to look in.
// Exits 1 when a file cannot be loaded or has an error-level diagnostic.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, relative, resolve, sep } from "node:path";

const require = createRequire(`${process.cwd()}/`);
let core;
try {
	core = require("@open-domain-specification/core");
} catch {
	console.error(
		"@open-domain-specification/core is not installed here. Run from the project root, install it (npm i -D @open-domain-specification/core), or use: npx -p @open-domain-specification/core node validate.mjs <folder>",
	);
	process.exit(2);
}
const { WorkspaceSet } = core;

/** Every .json under a folder but a schema.json, at any depth. */
function jsonFilesUnder(folder) {
	return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
		const full = resolve(folder, entry.name);
		if (entry.isDirectory()) return jsonFilesUnder(full);
		return entry.name.endsWith(".json") && entry.name !== "schema.json"
			? [full]
			: [];
	});
}

const given = process.argv.slice(2).map((it) => resolve(it));
if (given.length === 0) {
	console.error("usage: node validate.mjs <folder | file...>");
	process.exit(2);
}
const files = [
	...new Set(
		given.flatMap((it) =>
			statSync(it).isDirectory() ? jsonFilesUnder(it) : [it],
		),
	),
];
// The root of the set is the folder it was opened from: the one folder given, else
// the deepest folder that holds every file.
const folders = given.filter((it) => statSync(it).isDirectory());
let root =
	folders.length === 1 && given.length === 1
		? folders[0]
		: dirname(files[0] ?? ".");
while (files.some((it) => relative(root, it).startsWith("..")))
	root = dirname(root);

const byCodePoint = (a, b) => (a < b ? -1 : a > b ? 1 : 0);
const toSetPath = (it) => relative(root, it).split(sep).join("/");

let failed = false;
const entries = [];
for (const file of files.sort((a, b) =>
	byCodePoint(toSetPath(a), toSetPath(b)),
)) {
	let schema;
	try {
		schema = JSON.parse(readFileSync(file, "utf8"));
	} catch (error) {
		console.log(
			`[load-error] ${toSetPath(file)}: not JSON (${error instanceof Error ? error.message : error})`,
		);
		failed = true;
		continue;
	}
	// The loader takes a workspace file; JSON of another shape can make it throw,
	// so a file that is not one is reported and left out, not loaded.
	const plain = (value) =>
		typeof value === "object" && value !== null && !Array.isArray(value);
	const { $schema: _schema, ...rest } = plain(schema) ? schema : {};
	if (
		!plain(schema) ||
		typeof rest.id !== "string" ||
		typeof rest.name !== "string" ||
		!plain(rest.boundedcontexts ?? {}) ||
		!plain(rest.domains ?? {}) ||
		!Array.isArray(rest.relationships ?? [])
	) {
		console.log(
			`[load-error] ${toSetPath(file)}: not a workspace file (needs a string id and name, and objects for boundedcontexts and domains, and an array for relationships)`,
		);
		failed = true;
		continue;
	}
	entries.push([toSetPath(file), rest]);
}

// A malformed element deep inside a file can still make the loader throw, so each
// file is tried on its own first: one that throws is a problem of that file, reported
// and left out, and the rest are loaded together.
const loadable = [];
for (const entry of entries) {
	try {
		WorkspaceSet.fromSchemas([entry]);
		loadable.push(entry);
	} catch (error) {
		console.log(
			`[load-error] ${entry[0]}: could not be loaded (${error instanceof Error ? error.message : error}); fix the element it names or remove the file`,
		);
		failed = true;
	}
}
const set = WorkspaceSet.fromSchemas(loadable);
const diagnostics = set.validate();
console.log(
	`${set.workspaces.length} workspace(s), ${diagnostics.length} diagnostic(s)`,
);
for (const d of diagnostics) {
	console.log(`  [${d.severity}] ${d.rule}: ${d.message} (${d.file} ${d.ref})`);
	if (d.severity === "error") failed = true;
}
process.exit(failed ? 1 : 0);
