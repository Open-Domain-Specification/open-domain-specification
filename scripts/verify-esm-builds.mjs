#!/usr/bin/env node
// Regression gate for the ESM build of every published package: import each
// package's dist/*.mjs entry under a real Node ESM loader (no CJS interop
// tricks), the way an ESM-only consumer would. A named import of a
// CommonJS-default-only dependency (e.g. `import { debug } from "debug"`)
// builds fine but throws at import time under Node — this only catches that
// class of bug if it actually loads the file, so keep it as a real import.
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");

const entries = [
	"packages/core/dist/index.mjs",
	"packages/graphviz/dist/index.mjs",
	"packages/doc/dist/index.mjs",
	"packages/skill/dist/index.mjs",
	"packages/pages/dist/index.mjs",
	"packages/pages/dist/site.mjs",
];

let failed = false;

for (const entry of entries) {
	const absolute = path.join(root, entry);
	try {
		const mod = await import(`file://${absolute}`);
		console.log(`ok  ${entry} (${Object.keys(mod).length} exports)`);
	} catch (error) {
		failed = true;
		console.error(`FAIL ${entry}: ${error.message}`);
	}
}

if (failed) {
	process.exit(1);
}
