import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig } from "@playwright/test";

export default defineConfig({
	testDir: ".",
	testMatch: "*.pw.mjs",
	retries: 0,
	workers: 1,
	reporter: [["json"]],
	// Run output goes to the OS temp dir: the checker's tests run this fixture
	// on every gate and CI run, and must not leave files in the checkout.
	outputDir: join(tmpdir(), "ods-playwright-outcomes"),
});
