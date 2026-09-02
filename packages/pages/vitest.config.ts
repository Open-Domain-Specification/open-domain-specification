import { svelte } from "@sveltejs/vite-plugin-svelte";
import { defineConfig } from "vitest/config";

/** Unit suite only; e2e lives in playwright.config.ts and runs separately. */
export default defineConfig({
	plugins: [svelte()],
	resolve: { conditions: ["browser"] },
	test: {
		globals: true,
		environment: "node",
		environmentMatchGlobs: [["src/{lib,app}/**", "jsdom"]],
		include: ["src/**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist", "app", "e2e"],
		setupFiles: ["src/lib/test-setup.ts"],
		// The every-page suites render hundreds of pages with wasm diagrams; under a full-repo run they need more than the default.
		testTimeout: 30_000,
		watch: false,
		clearMocks: true,
		restoreMocks: true,
		coverage: {
			provider: "v8",
			reporter: ["text", "html"],
			include: ["src/**/*.{ts,svelte}"],
			exclude: [
				"src/**/*.{test,stories,harness}.{ts,svelte}",
				"src/lib/fixtures.ts",
				"src/lib/test-setup.ts",
				"src/lib/xyflow-test-env.ts",
				"src/app/main.ts",
				// Types only; nothing for v8 to instrument.
				"src/protocol.ts",
			],
			thresholds: {
				lines: 100,
				functions: 100,
				branches: 100,
				statements: 100,
			},
		},
	},
});
