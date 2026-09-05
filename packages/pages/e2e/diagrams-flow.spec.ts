import { expect, test } from "@playwright/test";
import { openInteractiveDiagram } from "./helpers";

/**
 * The flow map on the Sales context: the reaction chain, in the shapes the
 * static renderer draws it in, with the one dashed edge that is not a step.
 */

const SALES = "#/boundedcontexts/sales_bc";
const ORDER = `${SALES}/aggregates/order`;
const FULFILMENT = `${SALES}/processes/order_fulfilment`;

test("draws a node per step in its own shape, with the kind's codicon", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "flow map", SALES);
	await expect(flow.locator(".flow-node").first()).toBeVisible();
	// No style select here: only the context map has a sketch form.
	await expect(flow.locator(".diagram-options")).toBeVisible();
	await expect(
		flow.locator(".diagram-options").getByLabel("Diagram style"),
	).toHaveCount(0);

	// A process is graphviz's folder: square top-left corner where the tab
	// meets the card, and the card dropped by the tab's height.
	const process = flow.locator(
		`.svelte-flow__node[data-id="${FULFILMENT}"] .flow-node`,
	);
	await expect(process).toHaveAttribute("data-step", "process");
	await expect(process.locator("strong")).toHaveText("Order fulfilment");
	await expect(process.locator(".group")).toContainText("Sales");
	await expect(process.locator(".codicon-server-process")).toBeVisible();
	await expect(process).toHaveCSS("border-top-left-radius", "0px");
	await expect(process).toHaveCSS("border-top-right-radius", "2px");
	await expect(process).toHaveCSS("margin-top", "9px");
	// Nothing on this page is the page's own reaction, so nothing is marked.
	await expect(flow.locator(".flow-node.focus")).toHaveCount(0);

	// An event is graphviz's ellipse, kept as a stadium so the name has a
	// straight run of shape to sit on.
	const placed = flow.locator(
		`.svelte-flow__node[data-id="${ORDER}/provides/order_placed"] .flow-node`,
	);
	await expect(placed).toHaveAttribute("data-step", "event");
	await expect(placed).toHaveCSS("border-top-left-radius", "999px");
	await expect(placed.locator(".codicon-broadcast")).toBeVisible();
	// A consumable clusters under the provider that offers it.
	await expect(placed.locator(".group")).toContainText("Order");

	// An operation is the plain box the other UML nodes already are.
	const approve = flow.locator(
		`.svelte-flow__node[data-id="${ORDER}/provides/approve_order"] .flow-node`,
	);
	await expect(approve).toHaveAttribute("data-step", "command");
	await expect(approve).toHaveCSS("border-top-left-radius", "2px");
	await expect(approve.locator(".codicon-zap")).toBeVisible();

	// A step reached in another context reads as belonging over there.
	await expect(
		flow
			.locator(".cluster-node .cluster-label", { hasText: "Catalog" })
			.first(),
	).toBeVisible();
	await expect(
		flow.locator('.cluster-node[data-depth="0"] .cluster-label'),
	).toContainText("Petstore");
});

test("draws a step as a plain arrow and what completes a process as a dashed edge saying so", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "flow map", SALES);
	const step = flow.locator(
		`.svelte-flow__edge[data-id="${FULFILMENT}|${ORDER}/provides/approve_order"]`,
	);
	await expect(step).toBeAttached();
	await expect(step).not.toHaveClass(/dashed/);
	await expect(step.locator(".edge-label")).toHaveCount(0);
	await expect(step.locator("path.svelte-flow__edge-path")).toHaveAttribute(
		"marker-end",
		/.+/,
	);
	await expect(step).toHaveClass(/animated/);

	const ends = flow.locator(
		`.svelte-flow__edge[data-id="${FULFILMENT}|${ORDER}/provides/order_delivered"]`,
	);
	await expect(ends).toBeAttached();
	await expect(ends).toHaveClass(/dashed/);
	await expect(ends.locator(".edge-label")).toHaveText("ends");
	// It has a direction — the process ends on that fact, not the other way round.
	await expect(ends.locator("path.svelte-flow__edge-path")).toHaveAttribute(
		"marker-end",
		/.+/,
	);
});

test("the legend names every shape drawn, the step arrow and the ends edge", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "flow map", SALES);
	const legend = flow.locator(".diagram-legend");
	await expect(legend.getByRole("button", { name: "Legend" })).toBeVisible();
	const terms = await legend.locator("dt").allTextContents();
	expect(terms).toEqual(["stadium", "box", "folder", "arrow", "dashed ends"]);
	// Sales declares no policy, so the note is not indexed.
	expect(terms).not.toContain("note");
	// Every shape the legend names is a shape on the canvas.
	for (const step of ["event", "command", "process"])
		expect(
			await flow.locator(`.flow-node[data-step="${step}"]`).count(),
		).toBeGreaterThan(0);
});

test("a process page marks its own process in the map and the legend names the mark", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "flow map", FULFILMENT);
	const process = flow.locator(
		`.svelte-flow__node[data-id="${FULFILMENT}"] .flow-node`,
	);
	await expect(process).toHaveClass(/focus/);
	// Weight, not hue: the mark is a heavier border in the theme foreground.
	await expect(process).toHaveCSS("border-top-width", "2px");
	const fg = await flow.evaluate((el) =>
		getComputedStyle(el).getPropertyValue("--fg").trim(),
	);
	expect(
		await process.evaluate((el) => getComputedStyle(el).borderTopColor),
	).toBe(
		await flow.evaluate((el, fg) => {
			const probe = document.createElement("span");
			probe.style.color = fg;
			el.appendChild(probe);
			const color = getComputedStyle(probe).color;
			probe.remove();
			return color;
		}, fg),
	);
	// One node marked, and only one.
	await expect(flow.locator(".flow-node.focus")).toHaveCount(1);
	const terms = await flow.locator(".diagram-legend dt").allTextContents();
	expect(terms).toContain("bold outline");
});
