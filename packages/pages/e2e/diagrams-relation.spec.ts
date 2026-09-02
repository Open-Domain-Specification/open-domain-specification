import { expect, test } from "@playwright/test";
import { ORDER_REF, servePetstore, viewerAt } from "./helpers";

/** The interactive relation map draws UML class boxes and connectors, as the Graphviz image does. */

const SHIPMENT_REF = "#/boundedcontexts/fulfilment_bc/aggregates/shipment";

async function openInteractive(
	page: import("@playwright/test").Page,
	ref: string,
) {
	await servePetstore(page);
	await page.goto(viewerAt(ref));
	const figure = page.locator("figure.diagram").first();
	await figure.scrollIntoViewIfNeeded();
	await figure.getByRole("button", { name: "interactive" }).click();
	const flow = figure.locator(".svelte-flow");
	await expect(flow.locator(".relation-node").first()).toBeVisible();
	return flow;
}

test("draws each element as a UML class box with stereotype, attributes and cluster path", async ({
	page,
}) => {
	const flow = await openInteractive(page, ORDER_REF);

	const order = flow.locator('.svelte-flow__node[data-id$="/entities/order"]');
	await expect(order.locator(".relation-node")).toHaveClass(/core/);
	await expect(order.locator(".stereotype")).toHaveText("«root entity»");
	await expect(order.locator("strong")).toHaveText("Order");
	await expect(order.locator(".attrs li").first()).toContainText("{id}");
	await expect(order.locator(".attrs li .type").first()).toBeVisible();
	await expect(order.locator(".group")).toContainText("Order");

	const status = flow.locator(
		'.svelte-flow__node[data-id$="/valueobjects/order_status"]',
	);
	await expect(status.locator(".relation-node")).toHaveClass(/muted/);
	await expect(status.locator(".stereotype")).toHaveText("«value object»");

	// One flat shaded cluster per aggregate, labelled with its path below the workspace.
	const clusters = flow.locator(".cluster-node");
	expect(await clusters.count()).toBeGreaterThan(0);
	await expect(clusters.first()).toHaveAttribute("data-depth", "0");
	await expect(
		flow.locator(".cluster-node .cluster-label", { hasText: "Order" }).first(),
	).toBeVisible();
});

test("draws uses as a dashed dependency and references as an association, with label and cardinality", async ({
	page,
}) => {
	const flow = await openInteractive(page, ORDER_REF);

	const uses = flow.locator(".svelte-flow__edge-path.uses").first();
	await expect(uses).toBeVisible();
	await expect(uses).toHaveAttribute("style", /stroke-dasharray/);
	await expect(uses).toHaveAttribute("marker-end", /vee/);

	const references = flow.locator(".svelte-flow__edge-path.references").first();
	await expect(references).toBeVisible();
	await expect(references).not.toHaveAttribute("style", /stroke-dasharray/);
	await expect(references).toHaveAttribute("marker-end", /vee/);

	await expect(
		flow.locator(".edge-label", { hasText: "for-pet" }).first(),
	).toBeVisible();
	// The cardinality is a port at the target end; the source end has none.
	await expect(
		flow.locator(".port.cardinality .port-label", { hasText: "0..1" }).first(),
	).toBeVisible();
	await expect(flow.locator(".port:not(.cardinality)")).toHaveCount(0);
});

test("draws includes as a composition with a filled diamond at the whole", async ({
	page,
}) => {
	const flow = await openInteractive(page, SHIPMENT_REF);

	const includes = flow.locator(".svelte-flow__edge-path.includes").first();
	await expect(includes).toBeVisible();
	await expect(includes).toHaveAttribute("marker-start", /diamond/);
	await expect(includes).not.toHaveAttribute("marker-end", /.+/);
	await expect(flow.locator("marker .marker-fill").first()).toBeAttached();
	await expect(
		flow.locator(".edge-label", { hasText: "attempted-by" }).first(),
	).toBeVisible();
	await expect(
		flow.locator(".port.cardinality .port-label", { hasText: "*" }).first(),
	).toBeVisible();
});

test("relation edges float and restyle through the options panel", async ({
	page,
}) => {
	const flow = await openInteractive(page, ORDER_REF);
	const panel = flow.locator(".diagram-options");
	await panel.getByLabel("Handle placement").selectOption("floating");
	await expect(
		flow.locator(".relation-node .handle-hidden").first(),
	).toBeAttached();
	for (const style of ["straight", "step", "smoothstep", "bezier"]) {
		await panel.getByLabel("Edge style").selectOption(style);
		await expect(
			flow.locator(".svelte-flow__edge-path.uses").first(),
		).toBeVisible();
		await expect(flow.locator(".port.cardinality").first()).toBeVisible();
	}
	await panel.getByLabel("Handle placement").selectOption("fixed");
	await expect(flow.locator(".handle-hidden")).toHaveCount(0);
});
