import { expect, test } from "@playwright/test";
import {
	PETSTORE_PATH,
	PETSTORE_URL,
	servePetstore,
	viewerAt,
	WORKSPACE_NAME,
} from "./helpers";

/** The import screen: the three ways in, the two ways it fails, and what it remembers. */

test.beforeEach(async ({ page }) => {
	await servePetstore(page);
});

test("imports the workspace named by the url query parameter", async ({
	page,
}) => {
	await page.goto(viewerAt());

	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
	await expect(page.locator("nav.tree")).toBeVisible();
});

test("imports the workspace typed into the url form", async ({ page }) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "Open a workspace" }),
	).toBeVisible();
	await page.getByLabel("From a URL").fill(PETSTORE_URL);
	await page.getByRole("button", { name: "Load" }).click();

	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
});

test("imports the workspace from a relative url typed into the form", async ({
	page,
}) => {
	await page.goto("/");

	await expect(
		page.getByRole("heading", { name: "Open a workspace" }),
	).toBeVisible();
	await page.getByLabel("From a URL").fill("./examples/petstore.json");
	await page.getByRole("button", { name: "Load" }).click();

	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
});

test("imports a workspace picked from disk", async ({ page }) => {
	await page.goto("/");

	await page.locator("input[type=file]").setInputFiles(PETSTORE_PATH);

	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
	// v2 keeps the version and the file out of the title and states them as
	// two definitions under it.
	await expect(page.locator("main .page-header dd")).toContainText([
		"0.2.0",
		"petstore.json",
	]);
});

test("reports a url that cannot be fetched", async ({ page }) => {
	await page.route("**/missing.json", (route) =>
		route.fulfill({ status: 404 }),
	);
	await page.goto("/");

	await page
		.getByLabel("From a URL")
		.fill("https://workspaces.test/missing.json");
	await page.getByRole("button", { name: "Load" }).click();

	await expect(page.locator("p.error")).toContainText("404");
	await expect(page.locator("main h1")).toContainText("Open a workspace");
});

test("reports a file that is not json", async ({ page }) => {
	await page.goto("/");

	await page.locator("input[type=file]").setInputFiles({
		name: "notes.json",
		mimeType: "application/json",
		buffer: Buffer.from("this is not json"),
	});

	await expect(page.locator("p.error")).toBeVisible();
	await expect(page.locator("main h1")).toContainText("Open a workspace");
});

test("remembers the last url that loaded", async ({ page }) => {
	await page.goto("/");
	await page.getByLabel("From a URL").fill(PETSTORE_URL);
	await page.getByRole("button", { name: "Load" }).click();
	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);

	await page.goto("/");

	await expect(page.getByLabel("From a URL")).toHaveValue(PETSTORE_URL);
	expect(
		await page.evaluate(() => localStorage.getItem("ods-viewer-url")),
	).toBe(PETSTORE_URL);
});
