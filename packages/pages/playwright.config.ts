import { defineConfig } from "@playwright/test";

/**
 * End-to-end suite over the built app. `e2e/global-setup.ts` builds a static
 * export into `e2e/.export` and a Storybook into `storybook-static`; the
 * viewer is served by `vite preview` and everything else by a plain static
 * server, so every UI path runs against a real bundle. Storybook is in here
 * because a story that compiles is not a story that renders.
 */
export default defineConfig({
	testDir: "e2e",
	globalSetup: "./e2e/global-setup.ts",
	timeout: 30_000,
	retries: 0,
	reporter: [["list"]],
	use: { baseURL: "http://localhost:4173", trace: "retain-on-failure" },
	webServer: [
		{
			command: "npx vite preview --port 4173 --strictPort",
			port: 4173,
			reuseExistingServer: false,
		},
		{
			command: "node e2e/static-server.mjs 4174 e2e/.export",
			port: 4174,
			reuseExistingServer: false,
		},
		{
			command: "node e2e/static-server.mjs 4175 ../../models/petstore/docs",
			port: 4175,
			reuseExistingServer: false,
		},
		{
			command: "node e2e/static-server.mjs 4176 storybook-static",
			port: 4176,
			reuseExistingServer: false,
		},
	],
	projects: [{ name: "chromium", use: { browserName: "chromium" } }],
});
