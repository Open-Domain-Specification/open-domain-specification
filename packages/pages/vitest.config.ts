import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

export default defineConfig({
	plugins: [svelte()],
	resolve: { conditions: ["browser"] },
	test: {
		globals: true,
		environment: "node",
		environmentMatchGlobs: [["src/lib/**", "jsdom"]],
		include: ["src/**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist", "app"],
		setupFiles: ["src/lib/test-setup.ts"],
		watch: false,
		clearMocks: true,
		restoreMocks: true,
	},
});
