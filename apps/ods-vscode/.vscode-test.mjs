import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@vscode/test-cli";

// VS Code opens an IPC socket inside the user data dir and the OS caps that path
// at 103 characters; the default under .vscode-test/ is too long from a repo path
// of any depth, so park it in the system temp folder.
const userDataDir = join(tmpdir(), "ods-vscode-test");

// Integration tests run inside a real Extension Development Host, opened on the
// example workspace so the extension has four .ods files to load. Sources are
// compiled by tsconfig.test.json into out/; the extension itself is the esbuild
// bundle in dist/, exactly what ships.
export default defineConfig({
	files: "out/test/**/*.test.js",
	workspaceFolder: "../../packages/ods-example-ws",
	version: "1.96.4",
	launchArgs: ["--disable-extensions", "--user-data-dir", userDataDir],
	mocha: {
		ui: "bdd",
		timeout: 60000,
	},
});
