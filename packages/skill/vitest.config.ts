import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		include: ["**/*.{test,spec}.ts"],
		exclude: ["node_modules", "dist"],
		// The bundle module is a build output; make sure it exists before tests import it.
		globalSetup: ["./scripts/vitest-setup.mts"],
		watch: false,
		clearMocks: true,
		restoreMocks: true,
	},
});
