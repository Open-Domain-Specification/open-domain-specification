import { expect, test } from "@playwright/test";
import { ORDER_REF, openInteractiveDiagram } from "./helpers";

/** The interactive relation map draws UML class boxes and connectors, as the Graphviz image does. */

const SHIPMENT_REF = "#/boundedcontexts/fulfilment_bc/aggregates/shipment";

test("draws each element as a UML class with three compartments, stereotype, attributes and cluster path", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "relation map", ORDER_REF);
	await expect(flow.locator(".relation-node").first()).toBeVisible();
	// No style select here: the class diagram has no sketch form.
	await expect(
		flow.locator(".diagram-options").getByLabel("Diagram style"),
	).toHaveCount(0);
	await expect(flow.locator(".relation-node.sketch")).toHaveCount(0);

	const order = flow.locator('.svelte-flow__node[data-id$="/entities/order"]');
	await expect(order.locator(".relation-node")).toHaveClass(/core/);
	await expect(order.locator(".stereotype")).toHaveText("«root entity»");
	await expect(order.locator("strong")).toHaveText("Order");
	await expect(order.locator(".attrs li").first()).toContainText("{id}");
	await expect(order.locator(".attrs li .type").first()).toBeVisible();
	await expect(order.locator(".compartment")).toHaveCount(3);
	await expect(order.locator(".operations.compartment")).toBeAttached();
	await expect(order.locator(".group")).toContainText("Order");
	// The legend indexes the connectors and multiplicities in use.
	const terms = await flow.locator(".diagram-legend dt").allTextContents();
	expect(terms).toEqual(
		expect.arrayContaining(["open arrow", "dashed", "1, *, 0..1"]),
	);

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
	const flow = await openInteractiveDiagram(page, "relation map", ORDER_REF);

	// The short dash comes from the "dashed" class (paired with matching keyframes in
	// page.css so the animation loops without a jump), not an inline dasharray.
	const uses = flow.locator(".svelte-flow__edge-path.uses").first();
	await expect(uses).toBeVisible();
	await expect(uses).toHaveClass(/dashed/);
	await expect(uses).not.toHaveAttribute("style", /stroke-dasharray/);
	await expect(uses).toHaveCSS("stroke-dasharray", "6px, 3px");
	await expect(uses).toHaveAttribute("marker-end", /vee/);
	await expect(uses).toHaveCSS("stroke-width", "2px");
	await expect(flow.locator(".svelte-flow__edge").first()).toHaveClass(
		/animated/,
	);

	const references = flow.locator(".svelte-flow__edge-path.references").first();
	await expect(references).toBeVisible();
	await expect(references).not.toHaveClass(/dashed/);
	await expect(references).not.toHaveAttribute("style", /stroke-dasharray/);
	await expect(references).toHaveCSS("stroke-dasharray", "20px, 4px");
	await expect(references).toHaveAttribute("marker-end", /vee/);

	await expect(
		flow.locator(".edge-label", { hasText: "for-pet" }).first(),
	).toBeVisible();
	// The cardinality is a port at the target end; the source end has none.
	await expect(
		flow
			.locator(".port.cardinality.target .port-label", { hasText: "0..1" })
			.first(),
	).toBeVisible();
	await expect(flow.locator(".port:not(.cardinality)")).toHaveCount(0);
});

test('draws includes as a composition with a filled diamond and "1" at the whole', async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "relation map", SHIPMENT_REF);

	const includes = flow.locator(".svelte-flow__edge-path.includes").first();
	await expect(includes).toBeVisible();
	await expect(includes).toHaveAttribute("marker-start", /diamond/);
	await expect(includes).not.toHaveAttribute("marker-end", /.+/);
	await expect(flow.locator("marker .marker-fill").first()).toBeAttached();
	await expect(
		flow.locator(".edge-label", { hasText: "attempted-by" }).first(),
	).toBeVisible();
	await expect(
		flow
			.locator(".port.cardinality.target .port-label", { hasText: "*" })
			.first(),
	).toBeVisible();
	await expect(
		flow
			.locator(".port.cardinality.source .port-label", { hasText: "1" })
			.first(),
	).toBeVisible();
	const terms = await flow.locator(".diagram-legend dt").allTextContents();
	expect(terms).toContain("filled diamond");
});

test("relation edges float and restyle through the options panel", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "relation map", ORDER_REF);
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
