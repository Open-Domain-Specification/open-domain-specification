// Launches a VS Code extension host with this extension loaded against the
// petstore reference model, then keeps esbuild rebuilding on change. Reload
// the extension host window (Developer: Reload Window) to pick up a rebuild.
import { spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const target = process.argv[2]
	? resolve(process.argv[2])
	: resolve(here, "../../models/petstore");

// Prefer an installed app binary; fall back to whatever `code` is on PATH.
const candidates = [
	"/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code",
	"/usr/local/bin/code",
];
const code =
	process.env.VSCODE_BIN ?? candidates.find((c) => existsSync(c)) ?? "code";

spawn(code, [`--extensionDevelopmentPath=${here}`, target], {
	stdio: "inherit",
});

spawn(process.execPath, [resolve(here, "esbuild.mjs"), "--watch"], {
	stdio: "inherit",
});
