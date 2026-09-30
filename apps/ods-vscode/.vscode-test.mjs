import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { defineConfig } from "@vscode/test-cli";

// VS Code opens an IPC socket inside the user data dir and the OS caps that path
// at 103 characters; the default under .vscode-test/ is too long from a repo path
// of any depth, so park it in the system temp folder. CI sets
// ODS_VSCODE_USER_DATA to a fresh folder under the runner's temp directory, so
// every run starts clean and its logs can be uploaded.
const userDataDir =
	process.env.ODS_VSCODE_USER_DATA ?? join(tmpdir(), "ods-vscode-test");

// With ODS_RESULTS_DIR set, each config also writes `vscode-test-<label>.json`
// there (see src/test/results-reporter.cjs), which CI reads. Unset, the output is
// the plain spec reporter it always was.
const resultsDir = process.env.ODS_RESULTS_DIR;
const mocha = (label) => ({
	ui: "bdd",
	timeout: 60000,
	...(resultsDir
		? {
				reporter: resolve(import.meta.dirname, "src/test/results-reporter.cjs"),
				reporterOptions: {
					output: join(resultsDir, `vscode-test-${label}.json`),
				},
			}
		: {}),
});

// Integration tests run inside a real Extension Development Host, opened on the
// petstore reference model so the extension has an .ods file to load. Sources
// are compiled by tsconfig.test.json into out/; the extension itself is the
// esbuild bundle in dist/, exactly what ships.
const shared = {
	version: "1.96.4",
	launchArgs: ["--disable-extensions", "--user-data-dir", userDataDir],
};

export default defineConfig([
	{
		...shared,
		label: "petstore",
		mocha: mocha("petstore"),
		files: "out/test/extension.test.js",
		workspaceFolder: "../../models/petstore",
	},
	// A workspace whose descriptions carry hostile links, kept out of the
	// reference models so nothing generated changes.
	{
		...shared,
		label: "hostile-links",
		mocha: mocha("hostile-links"),
		files: "out/test/link-schemes.test.js",
		workspaceFolder: "src/test/fixtures/hostile-links",
	},
	// One small workspace holding every fact epic #62 compares across the
	// surfaces; `expected.ts` beside it is the list the viewer, the static
	// export and generated Markdown are held to as well.
	{
		...shared,
		label: "cross-surface",
		mocha: mocha("cross-surface"),
		files: "out/test/cross-surface.test.js",
		workspaceFolder: "src/test/fixtures/cross-surface",
	},
]);
