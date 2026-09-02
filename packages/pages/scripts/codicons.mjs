import { copyFileSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The page stylesheet uses codicons for element icons; ship the stylesheet and
// font under assets/ so every host copies one folder.
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const codicons = dirname(require.resolve("@vscode/codicons/package.json"));
const out = join(here, "../assets/codicons");
mkdirSync(out, { recursive: true });
for (const f of ["codicon.css", "codicon.ttf"])
	copyFileSync(join(codicons, "dist", f), join(out, f));
