import { expect, test } from "@playwright/test";
import { ORDER_REF, servePetstore, viewerAt, WORKSPACE_NAME } from "./helpers";

/** Moving around a loaded workspace: sidebar, table of contents, ref links and history. */

const ATTRIBUTE_REF = `${ORDER_REF}/entities/order/attributes/status`;

test.beforeEach(async ({ page }) => {
	await servePetstore(page);
	await page.goto(viewerAt());
	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);
});

test("the sidebar lists domains, contexts and teams", async ({ page }) => {
	const nav = page.locator("nav.site-nav");

	// Codicon glyphs are generated content, so accessible names carry a leading
	// private-use character; match on the label rather than the whole name.
	await expect(
		nav.getByRole("link", { name: "Petstore Commerce" }),
	).toBeVisible();
	await expect(nav.getByRole("link", { name: "Sales BC" })).toBeVisible();
	await expect(nav.getByRole("link", { name: /Order$/ })).toBeVisible();
	await expect(nav.getByRole("link", { name: "Orders Team" })).toBeVisible();
});

test("clicking a sidebar item routes to its page and marks it active", async ({
	page,
}) => {
	const nav = page.locator("nav.site-nav");
	await nav.getByRole("link", { name: "Sales BC" }).click();

	await expect(page).toHaveURL(/#\/boundedcontexts\/sales_bc$/);
	await expect(page.locator("main h1")).toContainText("Sales BC");
	await expect(nav.locator("a.active")).toHaveText(/Sales BC/);

	await nav.getByRole("link", { name: "Orders Team" }).click();

	await expect(page).toHaveURL(/#\/teams\/orders_team$/);
	await expect(page.locator("main h1")).toContainText("Orders Team");
	await expect(nav.locator("a.active")).toHaveText(/Orders Team/);
});

test("table of contents entries scroll to their section", async ({ page }) => {
	const toc = page.locator("aside.toc");
	await expect(toc.getByRole("link", { name: "Model health" })).toBeVisible();

	await expect(page.locator("#health")).not.toBeInViewport();
	await toc.getByRole("link", { name: "Model health" }).click();

	await expect(page.locator("#health")).toBeInViewport();
});

test("a ref link inside the page navigates", async ({ page }) => {
	await page
		.locator(`main a.ref[data-ref="#/teams/orders_team"]`)
		.first()
		.click();

	await expect(page.locator("main h1")).toContainText("Orders Team");
	await expect(page).toHaveURL(/#\/teams\/orders_team$/);
});

test("back and forward restore the pages visited", async ({ page }) => {
	const nav = page.locator("nav.site-nav");
	await nav.getByRole("link", { name: "Sales BC" }).click();
	await expect(page.locator("main h1")).toContainText("Sales BC");
	await nav.getByRole("link", { name: "Orders Team" }).click();
	await expect(page.locator("main h1")).toContainText("Orders Team");

	await page.goBack();
	await expect(page.locator("main h1")).toContainText("Sales BC");

	await page.goBack();
	await expect(page.locator("main h1")).toContainText(WORKSPACE_NAME);

	await page.goForward();
	await expect(page.locator("main h1")).toContainText("Sales BC");

	await page.goForward();
	await expect(page.locator("main h1")).toContainText("Orders Team");
});

test("a leaf ref opens its owner page and flashes the element", async ({
	page,
}) => {
	await page.evaluate((ref) => {
		location.hash = ref;
	}, ATTRIBUTE_REF);

	// An attribute has no page of its own, so its entity owns it.
	await expect(page.locator("main .crumbs .kind")).toHaveText("Entity");
	await expect(page.locator("main h1")).toContainText("Order");
	const row = page.locator(`tr[id="${ATTRIBUTE_REF}"]`);
	await expect(row).toHaveClass(/flash/);
	await expect(row).toBeInViewport();
});
