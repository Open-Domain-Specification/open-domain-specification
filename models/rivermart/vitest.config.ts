import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist", "docs"],
		coverage: {
			reporter: ["text", "json", "html"],
		},
		watch: false,
		clearMocks: true,
		restoreMocks: true,
	},
});
