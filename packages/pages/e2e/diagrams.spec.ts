import { expect, test } from "@playwright/test";
import {
	ORDER_REF,
	openInteractiveDiagram,
	servePetstore,
	viewerAt,
} from "./helpers";

/** The relation map on the Order aggregate: the Svelte Flow figure, node navigation and the options panel. */

test.beforeEach(async ({ page }) => {
	await servePetstore(page);
	await page.goto(viewerAt(ORDER_REF));
	await expect(page.locator("main h1")).toContainText("Order");
});

const relationMap = (page: import("@playwright/test").Page) =>
	page.locator("figure.diagram").first();

test("renders the relation map as a Svelte Flow figure with no static image or toggle", async ({
	page,
}) => {
	const figure = relationMap(page);
	await expect(figure).toContainText("relation map");
	const flow = figure.locator(".svelte-flow");
	await expect(flow).toBeVisible();
	await expect(flow.locator(".svelte-flow__node").first()).toBeVisible();
	expect(await flow.locator(".svelte-flow__node").count()).toBeGreaterThan(1);
	expect(await flow.locator(".svelte-flow__edge").count()).toBeGreaterThan(0);
	await expect(figure.getByRole("button", { name: "static" })).toHaveCount(0);
	await expect(figure.getByRole("button", { name: "interactive" })).toHaveCount(
		0,
	);
	await expect(figure.locator(".canvas > svg")).toHaveCount(0);
});

test("clicking an interactive node navigates to that element", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "relation map", ORDER_REF);

	const node = flow
		.locator(`.svelte-flow__node[data-id$="/valueobjects/order_status"]`)
		.first();
	await expect(node).toBeVisible();
	const ref = await node.getAttribute("data-id");
	const label = (await node.locator("strong").innerText()).trim();
	await node.click();

	await expect.poll(() => page.evaluate(() => location.hash)).toBe(ref);
	await expect(page.locator("main h1")).toContainText(label);
});

test("the options panel switches handles and edge styles", async ({ page }) => {
	const flow = await openInteractiveDiagram(page, "relation map", ORDER_REF);
	await expect(flow.locator(".svelte-flow__edge").first()).toBeVisible();
	const panel = flow.locator(".diagram-options");
	await expect(panel).toBeVisible();
	await panel.getByLabel("Handle placement").selectOption("floating");
	await expect(flow.locator(".handle-hidden").first()).toBeAttached();
	await expect(flow.locator(".svelte-flow__edge-path").first()).toBeVisible();
	for (const style of ["straight", "step", "smoothstep", "bezier"]) {
		await panel.getByLabel("Edge style").selectOption(style);
		await expect(flow.locator(".svelte-flow__edge-path").first()).toBeVisible();
	}
	await panel.getByLabel("Handle placement").selectOption("fixed");
	await expect(flow.locator(".handle-hidden")).toHaveCount(0);
	await page.reload();
	await expect(
		relationMap(page).locator(".diagram-options").getByLabel("Edge style"),
	).toHaveValue("bezier");
});

test("the fullscreen toggle fills the viewport and Escape brings the figure back", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "relation map", ORDER_REF);
	const box = page
		.locator("figure.diagram", { hasText: "relation map" })
		.locator(".interactive");
	const viewport = await page.evaluate(() => [
		window.innerWidth,
		window.innerHeight,
	]);
	const embedded = (await box.boundingBox())!;
	expect(embedded.height).toBeLessThan(viewport[1]);

	await flow.getByRole("button", { name: "Enter fullscreen" }).click();
	await expect(box).toHaveClass(/fullscreen/);
	await expect
		.poll(async () => {
			const b = (await box.boundingBox())!;
			return [b.x, b.y, b.width, b.height];
		})
		.toEqual([0, 0, viewport[0], viewport[1]]);
	// The controls travel with the figure, so the diagram stays usable at full size.
	await expect(flow.locator(".svelte-flow__minimap")).toBeVisible();
	await expect(flow.locator(".diagram-options")).toBeVisible();
	await expect(flow.locator(".svelte-flow__node").first()).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(box).not.toHaveClass(/fullscreen/);
	await expect
		.poll(async () => (await box.boundingBox())!.height)
		.toBe(embedded.height);
});
