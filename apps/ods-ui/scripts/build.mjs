import { cpSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

// The viewer is the pages package's Vite app (the same bundle the static
// export and the extension webview use). This app owns its deployable copy so
// the host publishes apps/ods-ui/dist and never reaches into a library package.
const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const pagesPkg = dirname(
	require.resolve("@open-domain-specification/pages/package.json"),
);
const dist = join(here, "../dist");
rmSync(dist, { recursive: true, force: true });
cpSync(join(pagesPkg, "app"), dist, { recursive: true });
console.log("ods-ui: viewer copied to dist");
