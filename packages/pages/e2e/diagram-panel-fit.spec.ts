import { expect, test } from "@playwright/test";
import { REFERENCE_MODELS, serveModel } from "./helpers";

/**
 * The guarantee the fit makes: the whole map is on the canvas and no node is
 * under a floating panel — the legend at the top left, the options panel at
 * the top right. A plain `fitView` knows nothing about either and slid a
 * bounded context underneath one of them (card 20).
 *
 * When the room runs out something gives way, in one order (card 64,
 * `src/lib/flow/panel-fit.ts`): the legend collapses to its header row, then
 * the options panel to its own, then the fit's air drops to the gutter, and
 * only then the zoom floor itself falls from 0.2 to 0.1. So the guarantee
 * holds for any map, and the price it cost is the step recorded in the
 * diagram's `data-fit` attribute — which this spec reports, so a map that has
 * gone quietly from readable to smudged shows up in the failure message
 * rather than in a reader's editor.
 *
 * Run over every workspace the repository ships, since the failing case only
 * appears once the map is wide enough to fill the canvas.
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

		// Every node is on the canvas, not cropped by the edge it was fitted to.
		const view = (await boxesOf(flow))[0];
		const outside = (await boxesOf(flow.locator(".svelte-flow__node"))).filter(
			(n) =>
				n.x < view.x ||
				n.y < view.y ||
				n.x + n.width > view.x + view.width ||
				n.y + n.height > view.y + view.height,
		);
		const step = await figure.locator(".interactive").getAttribute("data-fit");
		expect(
			outside.length,
			`nodes off the canvas on the ${model} context map, which fitted after giving way to "${step}"`,
		).toBe(0);
		// Which step it took is not a failure, but a map that had to give up its
		// floor is one to look at: the message says so when anything else fails.
		expect(
			["none", "legend", "options", "air", "floor"],
			`unknown relief step on the ${model} context map`,
		).toContain(step);
	});
}
