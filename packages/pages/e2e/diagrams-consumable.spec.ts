import { expect, test } from "@playwright/test";
import { openInteractiveDiagram } from "./helpers";

/** The consumable map on the Sales context: providers with slots, consumptions to slots. */

const SALES = "#/boundedcontexts/sales_bc";

test("draws providers with a slot per consumable, each with its own handle", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "consumable map", SALES);
	await expect(flow.locator(".consumable-node").first()).toBeVisible();
	const pet = flow.locator(
		'.svelte-flow__node[data-id="#/boundedcontexts/catalog_bc/aggregates/pet"]',
	);
	await expect(pet.locator("strong")).toHaveText("Pet");
	await expect(pet.locator(".group")).toContainText("Catalog");
	const slot = pet.locator('.slot[data-slot$="/provides/reserve_pet"]');
	await expect(slot).toBeVisible();
	await expect(slot.locator(".name")).toHaveText("ReservePet");
	// The slot's handle is a port showing the pattern it is offered under, with the full name as tooltip.
	const port = slot.locator(".svelte-flow__handle.target");
	await expect(port).toHaveClass(/port-handle/);
	await expect(port.locator(".port-label")).toHaveText("OHS");
	await expect(port).toHaveAttribute("title", "open-host-service");
	await expect(port).toHaveAttribute(
		"data-handleid",
		"#/boundedcontexts/catalog_bc/aggregates/pet/provides/reserve_pet",
	);
	await expect(port).toHaveCSS("height", "22px");
	// Operations act (zap) and events broadcast, as on the image.
	await expect(slot.locator(".codicon-zap")).toBeVisible();
	await expect(flow.locator(".slot .codicon-broadcast").first()).toBeVisible();
	// Namespace clusters nest from the workspace down to the context, each a shaded labelled region.
	await expect(
		flow.locator('.cluster-node[data-depth="0"] .cluster-label'),
	).toContainText("Petstore");
	await expect(
		flow
			.locator(".cluster-node .cluster-label", { hasText: "Catalog" })
			.first(),
	).toBeVisible();
});

test("labels each consumption with the consumable and the consumer pattern as a port", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "consumable map", SALES);
	const edge = flow
		.locator(".svelte-flow__edge", { hasText: "ReservePet" })
		.first();
	await expect(edge).toBeAttached();
	// Consumer ends are port badges above the lines; provider ends are the slots' own port handles, so edges draw none.
	const consumers = flow.locator(".port.consumer");
	expect(await consumers.count()).toBeGreaterThan(0);
	for (const text of await consumers
		.locator(".port-label")
		.evaluateAll((els) => els.map((el) => el.textContent)))
		expect(["CF", "ACL"]).toContain(text);
	await expect(consumers.first()).toHaveAttribute(
		"title",
		/conformist|anti-corruption-layer/,
	);
	await expect(flow.locator(".port.provider")).toHaveCount(0);
	await expect(edge.locator("path.svelte-flow__edge-path")).toHaveAttribute(
		"marker-end",
		/url/,
	);
});

test("keeps the slot as the target end in floating mode", async ({ page }) => {
	const flow = await openInteractiveDiagram(page, "consumable map", SALES);
	const path = flow
		.locator(".svelte-flow__edge", { hasText: "ReservePet" })
		.first()
		.locator("path.svelte-flow__edge-path");
	const before = await path.getAttribute("d");
	await flow
		.locator(".diagram-options")
		.getByLabel("Handle placement")
		.selectOption("floating");
	await expect(
		flow.locator(".consumable-node .handle-hidden").first(),
	).toBeAttached();
	await expect(path).toBeVisible();
	const after = await path.getAttribute("d");
	// Same slot end, so the two paths share their final point.
	const end = (d: string | null) =>
		(d ?? "").split(/[ ,]/).slice(-2).map(Number);
	const [bx, by] = end(before);
	const [ax, ay] = end(after);
	expect(ax).toBeCloseTo(bx, 1);
	expect(ay).toBeCloseTo(by, 1);
	await flow
		.locator(".diagram-options")
		.getByLabel("Handle placement")
		.selectOption("fixed");
});
