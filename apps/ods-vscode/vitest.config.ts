import { defineConfig } from "vitest/config";

export default defineConfig({
	// src/test holds the VS Code integration suite; it runs under Mocha inside a
	// real Extension Development Host (npm run test:vscode), never under vitest.
	test: {
		include: ["src/**/*.test.ts"],
		exclude: ["**/node_modules/**", "src/test/**"],
	},
});
