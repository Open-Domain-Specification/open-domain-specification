import { expect, test } from "@playwright/test";
import { REFERENCE_MODELS, serveModel } from "./helpers";

/**
 * The default fit has to leave the floating panels their room: the legend
 * hugs the top-left corner and the options panel the top-right, and on a
 * dense map a plain `fitView` slid a bounded context underneath one of them
 * (card 20). Run over every workspace the repository ships, since the failing
 * case only appears once the map is wide enough to fill the canvas.
 */

type Box = { x: number; y: number; width: number; height: number };

const boxesOf = (locator: import("@playwright/test").Locator) =>
	locator.evaluateAll((els) =>
		els.map((el) => {
			const r = el.getBoundingClientRect();
			return { x: r.x, y: r.y, width: r.width, height: r.height };
		}),
	);

const overlaps = (a: Box, b: Box) =>
	a.x < b.x + b.width &&
	b.x < a.x + a.width &&
	a.y < b.y + b.height &&
	b.y < a.y + a.height;

for (const model of REFERENCE_MODELS) {
	test(`the ${model} context map fits clear of the legend and the options panel`, async ({
		page,
	}) => {
		const url = await serveModel(page, model);
		await page.goto(`/?url=${encodeURIComponent(url)}`);
		const figure = page.locator("figure.diagram", { hasText: "Context map" });
		await figure.scrollIntoViewIfNeeded();
		const flow = figure.locator(".svelte-flow");
		await expect(flow.locator(".svelte-flow__node").first()).toBeVisible();
		const legend = flow.locator(".diagram-legend");
		await expect(legend).toBeVisible();
		await expect(flow.locator(".diagram-options")).toBeVisible();

		// The refit lands a couple of frames after the nodes are measured.
		await expect
			.poll(
				async () => {
					const panels = await boxesOf(
						flow.locator(".diagram-legend, .diagram-options"),
					);
					const nodes = await boxesOf(flow.locator(".svelte-flow__node"));
					return nodes.filter((n) => panels.some((p) => overlaps(n, p))).length;
				},
				{ message: `nodes under a panel on the ${model} context map` },
			)
			.toBe(0);
	});
}
