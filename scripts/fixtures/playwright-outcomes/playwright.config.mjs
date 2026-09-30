import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	testMatch: "*.pw.mjs",
	retries: 0,
	workers: 1,
	reporter: [["json"]],
	outputDir: "./test-results",
});
