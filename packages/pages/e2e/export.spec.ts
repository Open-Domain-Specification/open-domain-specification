import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { expect, test } from "@playwright/test";
import { EXPORT_DIR } from "./global-setup";
import { EXPORT_ORIGIN, WORKSPACE_NAME, watchForProblems } from "./helpers";

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
	await expect(page.locator("nav.tree")).toBeVisible();
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
	const problems = watchForProblems(page);

	await page.goto("/");
	await page.getByRole("link", { name: WORKSPACE_NAME }).click();
	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
	await expect(
		page.locator("figure.diagram .svelte-flow__node").first(),
	).toBeVisible();

	expect(problems.filter((p) => !/favicon/.test(p))).toEqual([]);
});

test("the export opens from a file:// URL", async ({ page }) => {
	// Every file is its own opaque origin under file://, so a module script or a
	// crossorigin asset would be blocked; the bundle must load as a plain script.
	// `watchForProblems` ignores `file://` responses, which carry no status.
	const problems = watchForProblems(page);

	await page.goto(pathToFileURL(join(EXPORT_DIR, "index.html")).href);
	await page.getByRole("link", { name: WORKSPACE_NAME }).click();
	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
	await expect(
		page.locator("figure.diagram .svelte-flow__node").first(),
	).toBeVisible();

	expect(problems.filter((p) => !/favicon/.test(p))).toEqual([]);
});
