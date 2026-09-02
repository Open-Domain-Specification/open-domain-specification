import { expect, test } from "@playwright/test";
import { openInteractiveDiagram } from "./helpers";

/** The interactive context map on the workspace page shows what the Graphviz image shows. */

test("the interactive context map draws context nodes with stereotypes and roles", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "Context map");
	await expect(flow.locator(".context-node").first()).toBeVisible();
	// Every context carries its domain/subdomain cluster path and a colour band.
	const first = flow.locator(".context-node").first();
	await expect(first.locator(".group")).toBeVisible();
	await expect(first).toHaveAttribute("style", /--band/);
	// Relationships show the stereotype in the middle and role ports at the ends.
	await expect(flow.locator(".stereotype").first()).toBeVisible();
	const texts = (sel: string) =>
		flow
			.locator(sel)
			.evaluateAll((els) => els.map((el) => el.textContent ?? ""));
	const stereotypes = await texts(".stereotype");
	for (const s of stereotypes)
		expect(["U/D", "C/S", "P", "SK", "SW"]).toContain(s);
	// Namespaces are nested shaded cluster regions, workspace outermost, each labelled at its top left.
	const clusters = flow.locator(".cluster-node");
	expect(await clusters.count()).toBeGreaterThan(1);
	await expect(
		flow.locator('.cluster-node[data-depth="0"] .cluster-label'),
	).toContainText("Petstore");
	await expect(
		flow.locator('.cluster-node[data-depth="1"]').first(),
	).toBeVisible();
	// Each end of a directed relationship is a port badge with the role abbreviation and the full name as its tooltip.
	const upstream = flow.locator(".port.upstream");
	await expect(upstream.first()).toBeVisible();
	for (const r of await texts(".port.upstream .port-label"))
		for (const part of r.split("+")) expect(["OHS", "PL"]).toContain(part);
	for (const r of await texts(".port.downstream .port-label"))
		for (const part of r.split("+")) expect(["CF", "ACL"]).toContain(part);
	await expect(upstream.first()).toHaveAttribute(
		"title",
		/open-host-service|published-language/,
	);
	// Ports are full-size and the line starts at their rim, not underneath them.
	await expect(upstream.first()).toHaveCSS("height", "22px");
	// Ports follow the floating ends.
	await flow
		.locator(".diagram-options")
		.getByLabel("Handle placement")
		.selectOption("floating");
	await expect(flow.locator(".handle-hidden").first()).toBeAttached();
	await expect(upstream.first()).toBeVisible();
});
