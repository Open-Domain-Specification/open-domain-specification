import { defineConfig } from "@playwright/test";

/**
 * Keyboard journeys in the real VS Code webview, driven by Playwright's
 * Electron support so the key presses are real input events. Like
 * `npm run test:vscode` it needs a GUI, so it is never part of the normal
 * suite or the landing gate. One window at a time: each test launches VS Code.
 */
export default defineConfig({
	testDir: ".",
	testMatch: "*.spec.ts",
	timeout: 120_000,
	workers: 1,
	retries: 0,
	reporter: [["list"]],
	outputDir: "../test-results-keyboard",
});
