import { PATTERNS } from "@open-domain-specification/core";
import { expect, test } from "@playwright/test";
import { openInteractiveDiagram } from "./helpers";

/** The interactive context map on the workspace page shows clusters, stereotypes and roles. */

test("the interactive context map draws context nodes with stereotypes and roles", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "Context map");
	// A fresh context map defaults to floating handles, with no user override yet.
	await expect(
		flow.locator(".diagram-options").getByLabel("Handle placement"),
	).toHaveValue("floating");
	await expect(flow.locator(".handle-hidden").first()).toBeAttached();
	// The cards style shows the cluster regions this test checks; sketch is the default.
	await flow
		.locator(".diagram-options")
		.getByLabel("Diagram style")
		.selectOption("cards");
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
	// The tooltip is the pattern's own name and meaning, from core's knowledge base.
	await expect(upstream.first()).toHaveAttribute(
		"title",
		new RegExp(
			[PATTERNS["open-host-service"], PATTERNS["published-language"]]
				.map((p) => `${p.name} — ${p.summary}`)
				.map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
				.join("|"),
		),
	);
	// Ports are full-size and the line starts at their rim, not underneath them.
	await expect(upstream.first()).toHaveCSS("height", "22px");
	// The style select is offered here, and only here.
	await expect(
		flow.locator(".diagram-options").getByLabel("Diagram style"),
	).toBeVisible();
	// Edges are twice Svelte Flow's stroke and every one animates.
	await expect(flow.locator(".svelte-flow__edge-path").first()).toHaveCSS(
		"stroke-width",
		"2px",
	);
	await expect(flow.locator(".svelte-flow__edge").first()).toHaveClass(
		/animated/,
	);
	// The legend lists exactly the abbreviations on show, with their full names, and collapses.
	const legend = flow.locator(".diagram-legend");
	const terms = await legend.locator("dt").allTextContents();
	for (const s of new Set(stereotypes)) expect(terms).toContain(s);
	for (const t of terms.filter((t) => /^[A-Z/]+$/.test(t)))
		expect(
			await flow.locator(".stereotype, .port-label", { hasText: t }).count(),
		).toBeGreaterThan(0);
	await expect(
		legend.locator("dd", { hasText: PATTERNS["open-host-service"].name }),
	).toBeVisible();
	await legend.getByRole("button", { name: "Legend" }).click();
	await expect(legend.locator("dl")).toHaveCount(0);
	await legend.getByRole("button", { name: "Legend" }).click();
	await expect(legend.locator("dl")).toBeVisible();
	// Ports follow the floating ends.
	await flow
		.locator(".diagram-options")
		.getByLabel("Handle placement")
		.selectOption("floating");
	await expect(flow.locator(".handle-hidden").first()).toBeAttached();
	await expect(upstream.first()).toBeVisible();
});

/** The three colours a disposition mark can change on a badge. */
const paint = (el: Element) => {
	const s = getComputedStyle(el);
	return [s.color, s.borderTopColor, s.backgroundColor];
};

/**
 * The evidence layer on the same map (RFC-002 section 4.2): the badges over a
 * marked intent carry its disposition, hover to what is known, and open the
 * relationship detail anchored inside the diagram.
 */
test("a marked badge on the Sales context map opens the relationship detail in place", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(
		page,
		"Sales BC context map",
		"#/boundedcontexts/sales_bc",
	);
	// Sales publishes to the Inventory projection, which conforms rather than
	// translating: a tolerated compromise, so every badge on that edge is
	// outlined instead of filled.
	const badge = flow.locator(".port.stereotype.tolerated");
	await expect(badge).toHaveText("U/D");
	const [, rim, fill] = await badge.evaluate(paint);
	expect(fill).toBe("rgba(0, 0, 0, 0)");
	const [, plainRim, plainFill] = await flow
		.locator(".port.stereotype:not(.tolerated):not(.refactor)")
		.first()
		.evaluate(paint);
	expect(plainFill).not.toBe("rgba(0, 0, 0, 0)");
	expect(rim).toBe(plainRim);
	// The one-line hover is the pattern's meaning, then what someone wrote down.
	await expect(badge).toHaveAttribute("title", /projection|conform/i);
	// The legend names the mark this map draws, and only that one.
	const terms = await flow.locator(".diagram-legend dt").allTextContents();
	expect(terms).toContain("outlined badge");
	expect(terms).not.toContain("warning badge");

	await expect(flow.locator(".anchored")).toHaveCount(0);
	await badge.getByRole("button").click();
	const card = flow.locator(".anchored");
	// The detail's own title is the direct child heading; the sections inside
	// it are level 3 too. It names both contexts, the pattern and the mark, so
	// the badge clicked and the card opened cannot be different relationships.
	await expect(card.locator(".relationship-detail > h3")).toHaveText(
		"Sales BC → Inventory BC upstream-downstream tolerated",
	);
	// The card is inside the flow viewport, so it pans and zooms with the map.
	await expect(
		card
			.locator("xpath=ancestor::*[contains(@class, 'svelte-flow__viewport')]")
			.first(),
	).toBeAttached();
	// The page never navigates: the detail is disclosed where the reader is.
	await expect(page).toHaveURL(/#\/boundedcontexts\/sales_bc$/);

	await page.keyboard.press("Escape");
	await expect(flow.locator(".anchored")).toHaveCount(0);
});

test("the shared kernel the model wants refactored is marked on the workspace map", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "Context map");
	// A symmetric relationship gives neither side a role, so the stereotype is
	// the only badge it has to carry the mark.
	const kernel = flow.locator(".port.stereotype.refactor");
	await expect(kernel).toHaveText("SK");
	const [color, rim] = await kernel.evaluate(paint);
	// The warning treatment is text and rim in one colour, and it is not the
	// colour an unmarked badge is drawn in.
	expect(rim).toBe(color);
	const [plainColor] = await flow
		.locator(".port.stereotype:not(.refactor):not(.tolerated)")
		.first()
		.evaluate(paint);
	expect(color).not.toBe(plainColor);
	expect(await flow.locator(".diagram-legend dt").allTextContents()).toContain(
		"warning badge",
	);

	await kernel.getByRole("button").click();
	await expect(flow.locator(".anchored .relationship-detail > h3")).toHaveText(
		"Catalog BC ↔ Inventory BC shared-kernel refactor",
	);
	// A click anywhere else dismisses it.
	await flow.locator(".svelte-flow__pane").click({ position: { x: 5, y: 5 } });
	await expect(flow.locator(".anchored")).toHaveCount(0);
});

/**
 * A badge that discloses evidence is a control, so the pointer has to reach it
 * wherever the layout puts it. Svelte Flow draws an edge label and a node at
 * the same z-index and the nodes layer is the later sibling, so a node whose
 * box reaches the badge took the click instead: the shared kernel's SK badge
 * was overlapped by the Sales card by a hair here and by more on a Linux
 * runner, whose fonts measure the card a few pixels bigger, and there the
 * click never landed at all (card 45). Asked as a hit test rather than by
 * clicking each badge, because the hit test names what covers the badge and a
 * click that cannot land only ever reports a timeout.
 */
test("every badge that discloses evidence takes the pointer where it is drawn", async ({
	page,
}) => {
	const flow = await openInteractiveDiagram(page, "Context map");
	const badges = flow.locator(".port.intent");
	await expect(badges.first()).toBeVisible();
	const problems = await badges.evaluateAll((els) =>
		els.flatMap((el) => {
			const button = el.querySelector("button");
			if (!button) return [`${el.textContent} is not a button`];
			const box = button.getBoundingClientRect();
			const over = document.elementFromPoint(
				box.x + box.width / 2,
				box.y + box.height / 2,
			) as HTMLElement | null;
			if (over && button.contains(over)) return [];
			// Whatever took the pointer, named the way the map names it.
			return [
				`${el.textContent} is under ${over?.dataset.id ?? over?.className ?? "nothing"}`,
			];
		}),
	);
	expect(problems).toEqual([]);
});
