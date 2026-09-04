import { expect, test } from "@playwright/test";
import { PETSTORE_SCHEMA } from "./helpers";

/** The VS Code webview path: no chrome of its own, driven entirely by host messages. */

type Posted = { type: string; ref?: string };
declare global {
	interface Window {
		__posted: Posted[];
	}
}

test.beforeEach(async ({ page }) => {
	await page.addInitScript(() => {
		window.__posted = [];
		(window as unknown as { acquireVsCodeApi: unknown }).acquireVsCodeApi =
			() => ({
				postMessage: (m: Posted) => window.__posted.push(m),
			});
	});
});

const posted = (page: import("@playwright/test").Page) =>
	page.evaluate(() => window.__posted);

test("announces itself and waits for a model", async ({ page }) => {
	await page.goto("/");

	await expect(page.locator("main")).toContainText("Workspace not loaded.");
	await expect(page.locator("nav.tree")).toHaveCount(0);
	await expect
		.poll(async () => await posted(page))
		.toContainEqual({ type: "ready" });
});

test("renders the model the host sends and reports where it landed", async ({
	page,
}) => {
	await page.goto("/");
	await expect
		.poll(async () => await posted(page))
		.toContainEqual({ type: "ready" });

	await page.evaluate((schema) => {
		window.postMessage(
			{
				type: "model",
				workspaces: [{ schema, fileLabel: "petstore.json" }],
				ref: "#/teams/orders_team",
			},
			"*",
		);
	}, PETSTORE_SCHEMA);

	await expect(page.locator("main h1")).toContainText("Orders Team");
	await expect(page.locator("nav.tree")).toHaveCount(0);
	await expect
		.poll(async () => await posted(page))
		.toContainEqual({ type: "navigated", ref: "#/teams/orders_team" });
});

test("follows navigate and reveal messages from the host", async ({ page }) => {
	await page.goto("/");
	await page.evaluate((schema) => {
		window.postMessage(
			{ type: "model", workspaces: [{ schema, fileLabel: "petstore.json" }] },
			"*",
		);
	}, PETSTORE_SCHEMA);
	await expect(page.locator("main h1")).toContainText("Swagger Petstore");

	await page.evaluate(() => {
		window.postMessage({ type: "navigate", ref: "#/teams/orders_team" }, "*");
	});
	await expect(page.locator("main h1")).toContainText("Orders Team");

	await page.evaluate(() => {
		window.postMessage({ type: "navigate", ref: "#/" }, "*");
	});
	await expect(page.locator("main h1")).toContainText("Swagger Petstore");

	await page.evaluate(() => {
		window.postMessage({ type: "toolbar", action: "reveal" }, "*");
	});
	await expect
		.poll(async () => await posted(page))
		.toContainEqual({ type: "reveal", ref: "#" });
});
