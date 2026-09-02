import { copyFileSync, cpSync, rmSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, context } from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));
const require = createRequire(import.meta.url);
const watch = process.argv.includes("--watch");

// The schema beside workspace files and the jsonValidation contribution both
// come from the core build, so the extension never carries its own copy.
const corePkg = dirname(
	require.resolve("@open-domain-specification/core/package.json"),
);
copyFileSync(
	join(corePkg, "dist/workspace.schema.json"),
	join(here, "schema.json"),
);

// vsce wants a licence beside the manifest; the repo keeps a single one at the root.
copyFileSync(join(here, "../../LICENSE.md"), join(here, "LICENSE.md"));

// The webview hosts the pages app; replace media/app with its Vite build so
// hashed chunks from earlier builds cannot linger beside the current entry.
const pagesPkg = dirname(
	require.resolve("@open-domain-specification/pages/package.json"),
);
rmSync(join(here, "media/app"), { recursive: true, force: true });
cpSync(join(pagesPkg, "app"), join(here, "media/app"), { recursive: true });

/** @type {import("esbuild").BuildOptions} */
const options = {
	entryPoints: [join(here, "src/extension.ts")],
	outfile: join(here, "dist/extension.js"),
	bundle: true,
	platform: "node",
	format: "cjs",
	target: "node20",
	external: ["vscode"],
	// jsonc-parser ships a UMD main whose inner requires esbuild cannot follow; take the ESM build.
	mainFields: ["module", "main"],
	sourcemap: true,
	logLevel: "info",
};

if (watch) {
	const ctx = await context(options);
	await ctx.watch();
} else {
	await build(options);
}
