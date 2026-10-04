#!/usr/bin/env node
// Validates one or more ODS workspace JSON files.
// Usage: node validate.mjs .ods/petstore.json [.ods/other.json ...]
// Exits 1 when a file fails to load or has an error-level diagnostic.
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

const require = createRequire(`${process.cwd()}/`);
let Workspace;
try {
	({ Workspace } = require("@open-domain-specification/core"));
} catch {
	console.error(
		"@open-domain-specification/core is not installed here. Run from the project root, install it (npm i -D @open-domain-specification/core), or use: npx -p @open-domain-specification/core node validate.mjs <file>",
	);
	process.exit(2);
}

let failed = false;
for (const file of process.argv.slice(2)) {
	let workspace;
	try {
		workspace = Workspace.fromSchema(JSON.parse(readFileSync(file, "utf8")));
	} catch (error) {
		console.log(
			`[load-error] ${file}: ${error instanceof Error ? error.message : error}`,
		);
		failed = true;
		continue;
	}
	const diagnostics = workspace.validate();
	console.log(`${file}: ${diagnostics.length} diagnostic(s)`);
	for (const d of diagnostics) {
		console.log(`  [${d.severity}] ${d.rule}: ${d.message} (${d.ref})`);
		if (d.severity === "error") failed = true;
	}
}
process.exit(failed ? 1 : 0);
