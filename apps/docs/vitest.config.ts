import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist"],
		watch: false,
		clearMocks: true,
		restoreMocks: true,
	},
});
