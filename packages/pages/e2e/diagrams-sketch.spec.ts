import { expect, test } from "@playwright/test";
import { openInteractiveDiagram } from "./helpers";

/** The sketch style on the workspace context map, the default: ellipse nodes over a Voronoi backdrop. */

test("the sketch style is the default, cards can be chosen, and sketch comes back", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "Context map");
	await expect(flow.locator(".context-node.sketch").first()).toBeVisible();
	await expect(flow.locator(".cluster-node")).toHaveCount(0);

	const panel = flow.locator(".diagram-options");
	await panel.getByLabel("Diagram style").selectOption("cards");
	await expect(flow.locator(".cluster-node").first()).toBeVisible();
	await expect(flow.locator(".sketch-backdrop")).toHaveCount(0);
	await panel.getByLabel("Diagram style").selectOption("sketch");

	// The backdrop sits under the nodes: one solid blob, dashed boundaries clipped to it, a label per group.
	const backdrop = flow.locator(".svelte-flow__viewport-back .sketch-backdrop");
	await expect(backdrop).toBeAttached();
	await expect(backdrop.locator(".blob")).toHaveAttribute("d", /^M.* C/);
	const boundaries = backdrop.locator(".boundaries");
	await expect(boundaries).toHaveAttribute("d", / L/);
	await expect(boundaries).toHaveCSS("stroke-dasharray", /\d/);
	expect(await backdrop.locator(".region-label").count()).toBeGreaterThan(1);
	// Domains are the union of their subdomains' cells: a thicker solid border with the name along it.
	const borders = backdrop.locator(".domain-borders");
	await expect(borders).toHaveAttribute("d", / L/);
	await expect(borders).toHaveCSS("stroke-width", "4px");
	await expect(borders).toHaveCSS("stroke-dasharray", "none");
	const domainLabels = backdrop.locator(".domain-label textPath");
	expect(await domainLabels.count()).toBeGreaterThan(0);
	const href = await domainLabels.first().getAttribute("href");
	await expect(backdrop.locator(`path${href}`)).toHaveAttribute("d", /^M/);
	await expect(backdrop.locator(".domain-label").first()).toHaveText(
		/Petstore Commerce|Customer Care|\S+/,
	);
	// Nodes are ellipses with the same content, handles and colours; the cluster regions are gone.
	const node = flow.locator(".context-node.sketch").first();
	await expect(node).toBeVisible();
	await expect(node).toHaveCSS("border-radius", /50%/);
	await expect(node).toHaveAttribute("style", /--band/);
	await expect(node.locator(".group")).toBeVisible();
	await expect(flow.locator(".cluster-node")).toHaveCount(0);
	await expect(flow.locator(".stereotype").first()).toBeVisible();
	await expect(flow.locator(".port.upstream").first()).toBeVisible();

	// Dragging a node well outside its cluster keeps it there (no parent extent clamps it) and reshapes the backdrop.
	await page.setViewportSize({ width: 1600, height: 1200 });
	const before = await backdrop.locator(".blob").getAttribute("d");
	// The legend panel overlays the top left, so drag a node that sits clear of it.
	const legend = (await flow.locator(".diagram-legend").boundingBox())!;
	const clear = async () => {
		for (const n of await flow.locator(".context-node.sketch").all()) {
			const b = (await n.boundingBox())!;
			if (b.x > legend.x + legend.width || b.y > legend.y + legend.height)
				return { node: n, box: b };
		}
		throw new Error("every node sits under the legend");
	};
	const { node: dragged, box } = await clear();
	/** The node's position in flow coordinates, from its wrapper's transform. */
	const wrapper = dragged.locator(
		"xpath=ancestor::div[contains(@class, 'svelte-flow__node')][1]",
	);
	const at = async () => {
		const [, x, y] = (await wrapper.getAttribute("style"))!.match(
			/translate\(([-\d.]+)px,\s*([-\d.]+)px\)/,
		)!;
		return { x: Number(x), y: Number(y) };
	};
	const zoom = Number(
		(await flow.locator(".svelte-flow__viewport").getAttribute("style"))!.match(
			/scale\(([\d.]+)\)/,
		)![1],
	);
	const start = await at();
	const dx = 420;
	const dy = 260;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		box.x + box.width / 2 + dx,
		box.y + box.height / 2 + dy,
		{ steps: 8 },
	);
	await page.mouse.up();
	await expect
		.poll(() => backdrop.locator(".blob").getAttribute("d"))
		.not.toBe(before);
	// Dragged the full distance in flow space (the canvas auto-pans near its edge, so screen boxes lie).
	const end = await at();
	// The pointer's drag threshold eats a few pixels; a parent extent would have clamped far more.
	expect((end.x - start.x) * zoom).toBeGreaterThan(dx * 0.85);
	expect((end.y - start.y) * zoom).toBeGreaterThan(dy * 0.85);
	// The domain border followed the node.
	await expect(borders).toHaveAttribute("d", / L/);

	// The choice sticks, and cards return on switching back.
	await page.reload();
	await expect(flow.locator(".context-node.sketch").first()).toBeVisible();
	await flow
		.locator(".diagram-options")
		.getByLabel("Diagram style")
		.selectOption("cards");
	await expect(flow.locator(".sketch-backdrop")).toHaveCount(0);
	await expect(flow.locator(".context-node.sketch")).toHaveCount(0);
	await expect(flow.locator(".cluster-node").first()).toBeVisible();
});

test("in the cards style the cluster boxes follow a dragged node", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "Context map");
	await page.setViewportSize({ width: 1600, height: 1200 });
	await flow
		.locator(".diagram-options")
		.getByLabel("Diagram style")
		.selectOption("cards");
	await expect(flow.locator(".cluster-node").first()).toBeVisible();
	// The outermost cluster wraps every node; drag one far beyond its right edge.
	const workspace = flow.locator('.cluster-node[data-depth="0"]');
	const before = (await workspace.boundingBox())!;
	const legend = (await flow.locator(".diagram-legend").boundingBox())!;
	let box: { x: number; y: number; width: number; height: number } | undefined;
	for (const n of await flow.locator(".context-node").all()) {
		const b = (await n.boundingBox())!;
		if (b.x > legend.x + legend.width || b.y > legend.y + legend.height) {
			box = b;
			break;
		}
	}
	if (!box) throw new Error("every node sits under the legend");
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		box.x + box.width / 2 + 500,
		box.y + box.height / 2 + 300,
		{ steps: 8 },
	);
	// The box grows during the drag, not only after it.
	await expect
		.poll(async () => (await workspace.boundingBox())!.width)
		.toBeGreaterThan(before.width);
	await page.mouse.up();
	const after = (await workspace.boundingBox())!;
	expect(after.width).toBeGreaterThan(before.width + 200);
	expect(after.height).toBeGreaterThan(before.height + 100);
	// The node stays inside the refitted box.
	const dragged = flow.locator(".svelte-flow__node", {
		has: page.locator(".context-node"),
	});
	const moved = (await dragged.first().boundingBox())!;
	expect(moved.x + moved.width).toBeLessThanOrEqual(after.x + after.width + 1);
});
