import { expect, test } from "@playwright/test";
import { openInteractiveDiagram } from "./helpers";

/** The consumable map on the Sales context as a UML component diagram: lollipops, sockets and assembly connectors. */

const SALES = "#/boundedcontexts/sales_bc";

test("draws «component» boxes with a lollipop per provided consumable and a socket per required one", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "consumable map", SALES);
	await expect(flow.locator(".consumable-node").first()).toBeVisible();
	// No style select here: the component diagram has no sketch form.
	await expect(flow.locator(".diagram-options")).toBeVisible();
	await expect(
		flow.locator(".diagram-options").getByLabel("Diagram style"),
	).toHaveCount(0);
	await expect(
		flow.locator(".diagram-options").getByLabel("Edge style"),
	).toBeVisible();
	// Catalog offers its operations through PetApp, so the open host Sales
	// calls is the application service's, not the Pet aggregate's.
	const pet = flow.locator(
		'.svelte-flow__node[data-id="#/boundedcontexts/catalog_bc/services/pet_app"]',
	);
	await expect(pet.locator(".consumable-node")).toHaveClass(/component/);
	await expect(pet.locator(".stereotype")).toHaveText("«component»");
	await expect(pet.locator("svg.component-icon")).toBeVisible();
	await expect(pet.locator("strong")).toHaveText("PetApp");
	await expect(pet.locator(".group")).toContainText("Catalog");
	const slot = pet.locator(
		'.slot.provided[data-slot$="/provides/reserve_pet_for_order"]',
	);
	await expect(slot).toBeVisible();
	await expect(slot.locator(".name")).toHaveText("ReservePetForOrder");
	// The lollipop is the slot's target handle, a port showing the pattern it is offered under.
	const port = slot.locator(".svelte-flow__handle.target");
	await expect(port).toHaveClass(/lollipop/);
	await expect(port).toHaveClass(/port-handle/);
	await expect(port.locator(".port-label")).toHaveText("OHS");
	await expect(port).toHaveAttribute("title", "open-host-service");
	await expect(port).toHaveAttribute(
		"data-handleid",
		"#/boundedcontexts/catalog_bc/services/pet_app/provides/reserve_pet_for_order",
	);
	await expect(port).toHaveCSS("height", "22px");
	await expect(port).toHaveCSS("border-radius", "11px");
	// Operations act (zap) and events broadcast, as on the image.
	await expect(slot.locator(".codicon-zap")).toBeVisible();
	await expect(flow.locator(".slot .codicon-broadcast").first()).toBeVisible();
	// A consumer's required interface is a socket: a source handle on its right edge with its own pattern.
	const sockets = flow.locator(
		".slot.required .svelte-flow__handle.source.socket",
	);
	expect(await sockets.count()).toBeGreaterThan(0);
	const socket = sockets.first();
	await expect(socket).toHaveCSS(
		"border-right-color",
		/rgba\(0, 0, 0, 0\)|transparent/,
	);
	await expect(socket).toHaveAttribute("data-handleid", /\/provides\//);
	// The legend indexes lollipop, socket and the patterns on show.
	const legend = flow.locator(".diagram-legend");
	await expect(legend.getByRole("button", { name: "Legend" })).toBeVisible();
	const terms = await legend.locator("dt").allTextContents();
	expect(terms).toEqual(expect.arrayContaining(["lollipop", "socket", "OHS"]));
	for (const t of terms.filter((t) => /^[A-Z]+$/.test(t)))
		expect(
			await flow.locator(".port-label", { hasText: t }).count(),
		).toBeGreaterThan(0);
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

test("draws each consumption as an assembly connector from socket to lollipop, named after the consumable", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "consumable map", SALES);
	const edge = flow
		.locator(".svelte-flow__edge", { hasText: "ReservePet" })
		.first();
	await expect(edge).toBeAttached();
	// Both ends are the components' own handles, each showing its pattern, so the edge draws no ports and no arrowhead.
	await expect(flow.locator(".port.consumer")).toHaveCount(0);
	await expect(flow.locator(".port.provider")).toHaveCount(0);
	const consumers = flow.locator(".socket.port-handle .port-label");
	expect(await consumers.count()).toBeGreaterThan(0);
	for (const text of await consumers.allTextContents())
		expect(["CF", "ACL"]).toContain(text);
	const path = edge.locator("path.svelte-flow__edge-path");
	await expect(path).toHaveClass(/assembly/);
	await expect(path).not.toHaveAttribute("marker-end", /.+/);
	// Edges are twice Svelte Flow's stroke, in the theme foreground so they stand out from the clusters, and animate along a long dash.
	await expect(path).toHaveCSS("stroke-width", "2px");
	await expect(path).toHaveCSS("stroke-opacity", "0.7");
	const fg = await flow.evaluate((el) =>
		getComputedStyle(el).getPropertyValue("--fg").trim(),
	);
	const stroke = await path.evaluate((el) => getComputedStyle(el).stroke);
	expect(stroke).toBe(
		await flow.evaluate((el, fg) => {
			const probe = document.createElement("span");
			probe.style.color = fg;
			el.appendChild(probe);
			const color = getComputedStyle(probe).color;
			probe.remove();
			return color;
		}, fg),
	);
	await expect(edge).toHaveClass(/animated/);
});

test("keeps the lollipop as the target end in floating mode", async ({
	page,
}) => {
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

test("a lollipop shows the node's pointer cursor and cannot be dragged into a connection", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "consumable map", SALES);
	const pet = flow.locator(
		'.svelte-flow__node[data-id="#/boundedcontexts/catalog_bc/aggregates/pet"]',
	);
	const port = pet
		.locator('.slot.provided[data-slot$="/provides/reserve_pet"]')
		.locator(".svelte-flow__handle.target");
	await expect(port).toBeVisible();
	// `pointer-events: none` is the whole point: the port intercepts nothing, so the cluster
	// region stacked beneath it fields the actual hit-test. Force the hover past that check and
	// read the cursor Svelte Flow's own crosshair rule would otherwise have won.
	await port.hover({ force: true });
	await expect(port).toHaveCSS("cursor", "pointer");
	// A read-only port: dragging from it must never start Svelte Flow's connection line.
	const box = (await port.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		box.x + box.width / 2 + 120,
		box.y + box.height / 2 + 80,
		{
			steps: 8,
		},
	);
	await expect(flow.locator(".svelte-flow__connectionline")).toHaveCount(0);
	await page.mouse.up();
	await expect(flow.locator(".svelte-flow__connectionline")).toHaveCount(0);
});
