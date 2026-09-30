import { expect, test } from "@playwright/test";
import { drive, expectOverlay, settledFit } from "./diagram-fit";
import { serveModel } from "./helpers";

/**
 * Fullscreen beside a classic scrollbar (#86). Playwright hides scrollbars by
 * default; a Linux desktop, and VS Code's webview on it, draws a 15px one that
 * takes room from the page. CI's real VS Code run found the overlay 15px wider
 * than what the reader could see: `100vw` counts the scrollbar, so the fit
 * drew into the strip under it. The launch option is the file's, since it
 * needs a browser of its own.
 */

const SCREEN = { width: 1300, height: 900 };

test.use({
	viewport: SCREEN,
	launchOptions: { ignoreDefaultArgs: ["--hide-scrollbars"] },
});

test("the overlay is the visible viewport, and the node nearest the scrollbar is painted", async ({
	page,
}) => {
	const url = await serveModel(page, "northbank");
	await page.goto(
		`/?url=${encodeURIComponent(url)}#/boundedcontexts/customer_&_kyc/services/onboarding_app`,
	);
	const figure = page.locator("figure.diagram", {
		hasText: "consumable map",
	});
	// A page long enough to scroll, as the Orders page in the webview is, with
	// the 15px classic scrollbar Linux draws: a styled scrollbar is laid out
	// beside the page, not over it, on every platform's Chromium.
	await page.addStyleTag({
		content:
			"html { overflow-y: scroll; } html::-webkit-scrollbar { width: 15px; }",
	});
	await figure.scrollIntoViewIfNeeded();
	const flow = figure.locator(".svelte-flow");
	await settledFit(flow);
	// The case only means something with a scrollbar taking room.
	const room = await page.evaluate(
		() => window.innerWidth - document.documentElement.clientWidth,
	);
	expect(room, "a classic scrollbar takes room from the page").toBeGreaterThan(
		0,
	);

	await drive(flow, page, "click");
	const fit = await expectOverlay(flow, page, "beside a classic scrollbar");
	// A wide map is held by the width, so its rightmost node sits one gutter
	// from the edge: hit-test just inside that node's right edge.
	const rightmost = fit.nodes.reduce((a, b) =>
		b.box.right > a.box.right ? b : a,
	);
	const hit = await page.evaluate(
		({ x, y, id }) =>
			!!document
				.elementFromPoint(x, y)
				?.closest(`.svelte-flow__node[data-id="${CSS.escape(id)}"]`),
		{
			x: rightmost.box.right - 2,
			y: (rightmost.box.top + rightmost.box.bottom) / 2,
			id: rightmost.id,
		},
	);
	expect(hit, `${rightmost.id} is painted, not under the scrollbar`).toBe(true);
});
