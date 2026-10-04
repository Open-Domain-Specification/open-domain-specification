import { expect, type Page, test } from "@playwright/test";
import { PETSTORE_SCHEMA, servePetstore, viewerAt } from "./helpers";

/**
 * After an import the reader asked for, focus is on the workspace's heading:
 * its name tells the reader the load worked, and the next Tab is the first
 * control in the page. A workspace that arrives any other way (a `?url=` deep
 * link, the host's `model` message in the webview) takes no focus.
 */

const focusInfo = (page: Page) =>
	page.evaluate(() => {
		const el = document.activeElement as HTMLElement | null;
		return {
			tag: el?.tagName ?? null,
			isH1: el?.matches("main h1") ?? false,
			inMain: !!el?.closest("main"),
		};
	});

test("typing a URL and pressing Enter lands focus on the workspace heading, and Tab goes on into the page", async ({
	page,
}) => {
	await servePetstore(page);
	await page.goto("/");
	await page.keyboard.press("Tab");
	await expect(page.getByLabel("From a URL")).toBeFocused();
	await page.keyboard.type("https://workspaces.test/.ods/petstore.json");
	await page.keyboard.press("Enter");

	await expect(page.locator("main h1")).toContainText("Swagger Petstore");
	expect((await focusInfo(page)).isH1).toBe(true);

	await page.keyboard.press("Tab");
	const next = await focusInfo(page);
	expect(next.isH1).toBe(false);
	expect(next.inMain).toBe(true);
});

test("pressing Load with the keyboard does the same", async ({ page }) => {
	await servePetstore(page);
	await page.goto("/");
	await page.keyboard.press("Tab");
	await page.keyboard.type("https://workspaces.test/.ods/petstore.json");
	await page.keyboard.press("Tab");
	await expect(page.getByRole("button", { name: "Load" })).toBeFocused();
	await page.keyboard.press("Enter");

	await expect(page.locator("main h1")).toContainText("Swagger Petstore");
	expect((await focusInfo(page)).isH1).toBe(true);
});

test("choosing a file does the same", async ({ page }) => {
	await page.goto("/");
	await page.locator("#file").setInputFiles({
		name: "petstore.json",
		mimeType: "application/json",
		buffer: Buffer.from(JSON.stringify(PETSTORE_SCHEMA)),
	});

	await expect(page.locator("main h1")).toContainText("Swagger Petstore");
	expect((await focusInfo(page)).isH1).toBe(true);
});

test("a ?url= deep link takes no focus", async ({ page }) => {
	await servePetstore(page);
	await page.goto(viewerAt());
	await expect(page.locator("main h1")).toContainText("Swagger Petstore");
	expect((await focusInfo(page)).tag).toBe("BODY");
});

test("a workspace the host hands the webview takes no focus (browser, not VS Code)", async ({
	page,
}) => {
	await page.addInitScript(() => {
		(window as unknown as { acquireVsCodeApi: unknown }).acquireVsCodeApi =
			() => ({ postMessage: () => undefined });
	});
	await page.goto("/");
	await page.evaluate((schema) => {
		window.postMessage(
			{ type: "model", workspaces: [{ schema, fileLabel: "p.json" }] },
			"*",
		);
	}, PETSTORE_SCHEMA);
	await expect(page.locator("main h1")).toBeVisible();
	expect((await focusInfo(page)).tag).toBe("BODY");
});
