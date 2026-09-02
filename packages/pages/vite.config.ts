import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";

/**
 * Ship the app as one classic script instead of `<script type="module" crossorigin>`.
 * Module scripts and `crossorigin` assets are blocked from `file://` (every file is
 * its own opaque origin), and the static export promises to open from a folder.
 *
 * The chunk is wrapped in a strict-mode IIFE so it behaves as the module did: no
 * top-level names leak onto `window` and it runs strict in the webview (which still
 * loads it as a module) and the export alike. The build fails if the bundle ever
 * needs module-only syntax or splits, since a classic script could not run it.
 */
function classicScript(): Plugin {
	return {
		name: "ods-classic-script",
		generateBundle(_, bundle) {
			const chunks = Object.values(bundle).filter((f) => f.type === "chunk");
			if (chunks.length !== 1) {
				this.error(`expected one script chunk, got ${chunks.length}`);
			}
			const chunk = chunks[0];
			if (/\bimport\.meta\b|\bimport\(|^(import|export)\b/m.test(chunk.code)) {
				this.error(
					`${chunk.fileName} needs module syntax; the app must stay a single classic script`,
				);
			}
			// Wrapped after minification so the directive survives.
			chunk.code = `(()=>{"use strict";${chunk.code}})();`;
		},
		transformIndexHtml(html) {
			const out = html
				.replace(/<script type="module" crossorigin /g, "<script defer ")
				.replace(
					/<link rel="stylesheet" crossorigin /g,
					'<link rel="stylesheet" ',
				);
			if (/type="module"|crossorigin/.test(out)) {
				throw new Error(
					"index.html still has a module script or crossorigin asset",
				);
			}
			return out;
		},
	};
}

// Builds the client-only app (viewer, static export and webview share it).
// The library entries are built by tsup into dist/; the app goes to app/.
export default defineConfig({
	plugins: [svelte(), classicScript()],
	build: {
		outDir: "app",
		emptyOutDir: true,
		modulePreload: false,
		rolldownOptions: { output: { codeSplitting: false } },
	},
	base: "./",
});
