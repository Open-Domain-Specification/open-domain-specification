import { expect, test } from "@playwright/test";
import { ORDER_REF, servePetstore, viewerAt } from "./helpers";

/** The relation map on the Order aggregate: static SVG, lightbox and the interactive view. */

test.beforeEach(async ({ page }) => {
	await servePetstore(page);
	await page.goto(viewerAt(ORDER_REF));
	await expect(page.locator("main h1")).toContainText("Order");
});

const relationMap = (page: import("@playwright/test").Page) =>
	page.locator("figure.diagram").first();

test("renders the relation map as an svg", async ({ page }) => {
	const figure = relationMap(page);

	await expect(figure).toContainText("relation map");
	await expect(figure.locator(".canvas svg")).toBeVisible();
});

test("opens the diagram in a lightbox and closes it again", async ({
	page,
}) => {
	const canvas = relationMap(page).locator(".canvas");
	await canvas.scrollIntoViewIfNeeded();
	await canvas.click();

	const modal = page.locator("#diagram-modal");
	await expect(modal).toBeVisible();
	await expect(modal.locator("svg")).toBeVisible();

	await canvas.press("Escape");
	await expect(modal).toHaveCount(0);

	await canvas.click();
	await expect(modal).toBeVisible();
	// The centred figure covers the middle of the backdrop; click its margin.
	await modal.locator(".modal-backdrop").click({ position: { x: 4, y: 4 } });
	await expect(modal).toHaveCount(0);
});

test("toggles between the interactive view and the static svg", async ({
	page,
}) => {
	const figure = relationMap(page);
	await figure.scrollIntoViewIfNeeded();
	await figure.getByRole("button", { name: "interactive" }).click();

	const flow = figure.locator(".svelte-flow");
	await expect(flow).toBeVisible();
	await expect(flow.locator(".svelte-flow__node").first()).toBeVisible();
	expect(await flow.locator(".svelte-flow__node").count()).toBeGreaterThan(1);
	expect(await flow.locator(".svelte-flow__edge").count()).toBeGreaterThan(0);

	await figure.getByRole("button", { name: "static" }).click();

	await expect(figure.locator(".canvas svg")).toBeVisible();
	await expect(flow).toHaveCount(0);
});

test("clicking an interactive node navigates to that element", async ({
	page,
}) => {
	const figure = relationMap(page);
	await figure.scrollIntoViewIfNeeded();
	await figure.getByRole("button", { name: "interactive" }).click();

	const node = figure
		.locator(`.svelte-flow__node[data-id$="/valueobjects/order_status"]`)
		.first();
	await expect(node).toBeVisible();
	const ref = await node.getAttribute("data-id");
	const label = (await node.locator("strong").innerText()).trim();
	await node.click();

	await expect.poll(() => page.evaluate(() => location.hash)).toBe(ref);
	await expect(page.locator("main h1")).toContainText(label);
});
