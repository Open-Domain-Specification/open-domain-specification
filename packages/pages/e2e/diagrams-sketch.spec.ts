import { expect, test } from "@playwright/test";
import { openInteractiveDiagram } from "./helpers";

/** The sketch style on the workspace context map: ellipse nodes over a Voronoi backdrop. */

test("switching to sketch draws ellipses over the backdrop and cards come back", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "Context map");
	await expect(flow.locator(".context-node").first()).toBeVisible();
	await expect(flow.locator(".cluster-node").first()).toBeVisible();
	await expect(flow.locator(".sketch-backdrop")).toHaveCount(0);

	const panel = flow.locator(".diagram-options");
	await panel.getByLabel("Diagram style").selectOption("sketch");

	// The backdrop sits under the nodes: one solid blob, dashed boundaries clipped to it, a label per group.
	const backdrop = flow.locator(".svelte-flow__viewport-back .sketch-backdrop");
	await expect(backdrop).toBeAttached();
	await expect(backdrop.locator(".blob")).toHaveAttribute("d", /^M.* C/);
	const boundaries = backdrop.locator(".boundaries");
	await expect(boundaries).toHaveAttribute("d", / L/);
	await expect(boundaries).toHaveCSS("stroke-dasharray", /\d/);
	expect(await backdrop.locator(".region-label").count()).toBeGreaterThan(1);
	// Nodes are ellipses with the same content, handles and colours; the cluster regions are gone.
	const node = flow.locator(".context-node.sketch").first();
	await expect(node).toBeVisible();
	await expect(node).toHaveCSS("border-radius", /50%/);
	await expect(node).toHaveAttribute("style", /--band/);
	await expect(node.locator(".group")).toBeVisible();
	await expect(flow.locator(".cluster-node")).toHaveCount(0);
	await expect(flow.locator(".stereotype").first()).toBeVisible();
	await expect(flow.locator(".port.upstream").first()).toBeVisible();

	// Dragging a node reshapes the backdrop.
	const before = await backdrop.locator(".blob").getAttribute("d");
	const box = (await node.boundingBox())!;
	await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
	await page.mouse.down();
	await page.mouse.move(
		box.x + box.width / 2 + 80,
		box.y + box.height / 2 + 60,
		{ steps: 6 },
	);
	await page.mouse.up();
	await expect
		.poll(() => backdrop.locator(".blob").getAttribute("d"))
		.not.toBe(before);

	// The choice sticks, and cards return on switching back.
	await page.reload();
	const figure = page.locator("figure.diagram", { hasText: "Context map" });
	await figure.getByRole("button", { name: "interactive" }).click();
	await expect(flow.locator(".context-node.sketch").first()).toBeVisible();
	await flow
		.locator(".diagram-options")
		.getByLabel("Diagram style")
		.selectOption("cards");
	await expect(flow.locator(".sketch-backdrop")).toHaveCount(0);
	await expect(flow.locator(".context-node.sketch")).toHaveCount(0);
	await expect(flow.locator(".cluster-node").first()).toBeVisible();
});
