import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vite";

// Builds the client-only app (viewer, static export and webview share it).
// The library entries are built by tsup into dist/; the app goes to app/.
export default defineConfig({
	plugins: [svelte()],
	build: { outDir: "app", emptyOutDir: true },
	base: "./",
});
