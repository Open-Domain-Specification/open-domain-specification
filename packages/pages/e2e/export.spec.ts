import { expect, test } from "@playwright/test";
import { EXPORT_ORIGIN, WORKSPACE_NAME } from "./helpers";

/** The static export: a folder on a plain host, two workspaces behind a picker. */

test.use({ baseURL: EXPORT_ORIGIN });

test("the landing page lists every exported workspace", async ({ page }) => {
	await page.goto("/");

	await expect(page.locator("main h1")).toHaveText("Domain Model");
	const entries = page.locator("ul.site-index li");
	await expect(entries).toHaveCount(2);
	await expect(entries.first()).toContainText(WORKSPACE_NAME);
	await expect(entries.first()).toContainText("petstore.json");
	await expect(entries.last()).toContainText("Second Workspace");
	await expect(entries.last()).toContainText("second.json");
});

test("picking a workspace opens it", async ({ page }) => {
	await page.goto("/");

	await page.getByRole("link", { name: "Second Workspace" }).click();

	await expect(page.locator("main h1")).toContainText("Second Workspace");
	await expect(page.locator("nav.site-nav")).toBeVisible();
});

test("deep links work once a workspace is picked", async ({ page }) => {
	await page.goto("/");
	await page.getByRole("link", { name: WORKSPACE_NAME }).click();
	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);

	await page.evaluate(() => {
		location.hash = "#/boundedcontexts/sales_bc";
	});

	await expect(page.locator("main h1")).toContainText("Sales BC");
	await expect(page).toHaveURL(/#\/boundedcontexts\/sales_bc$/);
});

test("a deep link survives the workspace picker", async ({ page }) => {
	await page.goto("/#/boundedcontexts/sales_bc");

	await page.getByRole("link", { name: WORKSPACE_NAME }).click();

	await expect(page.locator("main h1")).toContainText("Sales BC");
});

test("assets load without console errors", async ({ page }) => {
	const problems: string[] = [];
	page.on("console", (m) => {
		if (m.type() === "error") problems.push(m.text());
	});
	page.on("pageerror", (e) => problems.push(e.message));
	page.on("requestfailed", (r) => problems.push(`failed ${r.url()}`));
	page.on("response", (r) => {
		if (!r.ok()) problems.push(`${r.status()} ${r.url()}`);
	});

	await page.goto("/");
	await page.getByRole("link", { name: WORKSPACE_NAME }).click();
	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
	await expect(page.locator("figure.diagram svg")).toBeVisible();

	expect(problems.filter((p) => !/favicon/.test(p))).toEqual([]);
});
