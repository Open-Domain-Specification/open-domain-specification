import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig, type Plugin } from "vite";

/**
 * Emit a classic `<script defer>` instead of `<script type="module" crossorigin>`.
 * Module scripts and `crossorigin` assets are blocked from `file://` (every file is
 * its own opaque origin), and the static export promises to open from a folder.
 * The app is a single chunk with no import/export statements, so a classic script
 * runs it unchanged; `defer` keeps the module-script timing (after `#app` exists).
 */
function classicScript(): Plugin {
	return {
		name: "ods-classic-script",
		transformIndexHtml(html) {
			return html
				.replace(/<script type="module" crossorigin /g, "<script defer ")
				.replace(/<link rel="stylesheet" crossorigin /g, '<link rel="stylesheet" ');
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
