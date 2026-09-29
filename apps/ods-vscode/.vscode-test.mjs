import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@vscode/test-cli";

// VS Code opens an IPC socket inside the user data dir and the OS caps that path
// at 103 characters; the default under .vscode-test/ is too long from a repo path
// of any depth, so park it in the system temp folder.
const userDataDir = join(tmpdir(), "ods-vscode-test");

// Integration tests run inside a real Extension Development Host, opened on the
// petstore reference model so the extension has an .ods file to load. Sources
// are compiled by tsconfig.test.json into out/; the extension itself is the
// esbuild bundle in dist/, exactly what ships.
const shared = {
	version: "1.96.4",
	launchArgs: ["--disable-extensions", "--user-data-dir", userDataDir],
	mocha: {
		ui: "bdd",
		timeout: 60000,
	},
};

export default defineConfig([
	{
		...shared,
		label: "petstore",
		files: "out/test/extension.test.js",
		workspaceFolder: "../../models/petstore",
	},
	// A workspace whose descriptions carry hostile links, kept out of the
	// reference models so nothing generated changes.
	{
		...shared,
		label: "hostile-links",
		files: "out/test/link-schemes.test.js",
		workspaceFolder: "src/test/fixtures/hostile-links",
	},
]);
