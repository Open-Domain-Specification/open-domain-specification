import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { WorkspaceSet } from "@open-domain-specification/core";
import { generateSetDocs } from "@open-domain-specification/model-tools";
import { buildNorthbankSet, OUTPUT } from "./northbank-set.ts";

const require = createRequire(import.meta.url);

/**
 * Generates NorthBank's twelve workspace files under `.ods/`, one per team,
 * from the team DSL modules, and a copy of core's JSON schema beside them.
 *
 * There is no merged workspace and no manifest: the set is the twelve files.
 * A stale `northbank.json` (the single-workspace output this model used to
 * write) is removed, so no file in `.ods/` pretends to be the whole model.
 *
 * `docs/` is the Markdown site of the set `.ods/` now holds, written by
 * `@open-domain-specification/doc` (`toDocSet`) from the files just written,
 * read back in code point order of file name as every other reader of the
 * folder reads them: one folder of pages per file, linked to each other.
 */
const root = ".";
const set = buildNorthbankSet();

const diagnostics = set.validate();
console.log(
	`NorthBank: ${set.workspaces.length} workspaces, ${diagnostics.length} diagnostic(s)`,
);
for (const d of diagnostics) {
	console.log(`  [${d.severity}] ${d.rule}: ${d.message} (${d.file} ${d.ref})`);
}

const odsDir = path.join(root, OUTPUT.dir);
fs.mkdirSync(odsDir, { recursive: true });
for (const entry of fs.readdirSync(odsDir)) {
	if (entry.endsWith(".json") && !OUTPUT.files.includes(entry))
		fs.rmSync(path.join(odsDir, entry));
}
for (const [file, schema] of set.toSchemas()) {
	fs.writeFileSync(
		path.join(odsDir, file),
		JSON.stringify({ $schema: "./schema.json", ...schema }, null, 2),
		"utf-8",
	);
}
fs.copyFileSync(
	require.resolve("@open-domain-specification/core/dist/workspace.schema.json"),
	path.join(odsDir, "schema.json"),
);

// What was written must load back as the same set: a file that did not would
// be a defect of this build, not of the model.
const reloaded = WorkspaceSet.fromSchemas(
	OUTPUT.files.map((file) => {
		const { $schema: _schema, ...schema } = JSON.parse(
			fs.readFileSync(path.join(odsDir, file), "utf-8"),
		);
		return [file, schema];
	}),
);
if (reloaded.rejected.length > 0)
	throw new Error(
		`the written set has rejected files: ${JSON.stringify(reloaded.rejected)}`,
	);
const again = reloaded.validate();
if (JSON.stringify(again) !== JSON.stringify(diagnostics))
	throw new Error("the written set reports different diagnostics than the DSL");
console.log(`${OUTPUT.files.length} files written to ${odsDir} and reloaded`);

await generateSetDocs({ root });
console.log(`docs/ written for ${OUTPUT.files.length} workspaces`);
