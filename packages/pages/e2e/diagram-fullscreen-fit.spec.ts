import { expect, type Locator, type Page, test } from "@playwright/test";
import { expectClear, expectFilled, settledFit, sizeOf } from "./diagram-fit";
import { openPage } from "./diagram-hosts";
import { serveModel } from "./helpers";

/**
 * Fullscreen fills the screen (#86). The overlay is a fixed box the size of
 * the window, and the fit has to land in it: the graph reaching the gutter
 * along the axis that binds it, every node clear of every panel. Leaving
 * fullscreen puts the map back as it was fitted inline.
 *
 * The report suspected a capture taken before the refit landed. It was not:
 * driven by hand and left to settle, the workspace map stayed at 0.2 in the
 * top-left of a 1300x900 screen, and leaving drew it half again too wide for
 * its canvas. The refit ran a frame after the toggle, before Svelte Flow had
 * measured the new size, and fitted the old one each way. So every check
 * here waits for the settled fit (`diagram-fit.ts`), never a frame count.
 */

const SCREEN = { width: 1300, height: 900 };

/** Enters or leaves fullscreen the way a reader does: by pointer, by key, or by Escape. */
async function drive(
	flow: Locator,
	page: Page,
	how: "click" | "key" | "escape",
) {
	const label = (await flow
		.locator(".diagram-options .fullscreen")
		.getAttribute("aria-label")) as string;
	if (how === "escape") {
		await page.keyboard.press("Escape");
		return;
	}
	const button = flow.getByRole("button", { name: label });
	if (how === "click") await button.click();
	else {
		await button.focus();
		await page.keyboard.press("Enter");
	}
}

/** The overlay is up and covers the window. */
async function expectOverlay(flow: Locator, page: Page, where: string) {
	const fit = await settledFit(flow);
	const size = page.viewportSize() ?? SCREEN;
	expect(
		[fit.view.left, fit.view.top, fit.view.right, fit.view.bottom],
		`the fullscreen canvas covers the window, ${where}`,
	).toEqual([0, 0, size.width, size.height]);
	expectClear(fit, `fullscreen, ${where}`);
	expectFilled(fit, `fullscreen, ${where}`);
	return fit;
}

const CASES = [
	// Dense: fifteen contexts, fitted at the floor inline.
	["NorthBank's workspace map", "northbank", "#", "Context map"],
	// Sparse and wide: the map the inline report was about.
	[
		"OnboardingApp's consumable map",
		"northbank",
		"#/boundedcontexts/customer_&_kyc/services/onboarding_app",
		"consumable map",
	],
] as const;

for (const colorScheme of ["light", "dark"] as const) {
	test.describe(`fullscreen in the viewer, ${colorScheme}`, () => {
		test.use({ colorScheme, viewport: SCREEN });
		for (const [name, model, ref, caption] of CASES) {
			test(`${name} fills the screen, and fits its canvas again on leaving`, async ({
				page,
			}) => {
				const url = await serveModel(page, model);
				await page.goto(`/?url=${encodeURIComponent(url)}${ref}`);
				const figure = page.locator("figure.diagram", { hasText: caption });
				await figure.first().scrollIntoViewIfNeeded();
				const flow = figure.first().locator(".svelte-flow");
				const inline = await settledFit(flow);
				expectClear(inline, `${name} inline`);

				await drive(flow, page, "click");
				const full = await expectOverlay(flow, page, `${name} by pointer`);
				expect(full.zoom).toBeGreaterThan(inline.zoom);

				await drive(flow, page, "click");
				const back = await settledFit(flow);
				expect(sizeOf(back.view)).toEqual(sizeOf(inline.view));
				expect(back.zoom).toBeCloseTo(inline.zoom, 5);
				expectClear(back, `${name} after leaving`);
				expectFilled(back, `${name} after leaving`);
			});
		}
	});
}

for (const host of ["viewer", "export"] as const) {
	test.describe(`fullscreen by keyboard in the ${host}`, () => {
		test.use({ viewport: SCREEN });
		test("the petstore's map fills the screen from Enter and fits inline again after Escape", async ({
			page,
		}) => {
			await openPage(page, host, "#");
			const figure = page.locator("figure.diagram", { hasText: "Context map" });
			await figure.scrollIntoViewIfNeeded();
			const flow = figure.locator(".svelte-flow");
			const inline = await settledFit(flow);

			await drive(flow, page, "key");
			await expectOverlay(flow, page, `the petstore in the ${host} by Enter`);

			await drive(flow, page, "escape");
			await expect(flow.locator("xpath=..")).not.toHaveClass(/fullscreen/);
			const back = await settledFit(flow);
			expect(sizeOf(back.view)).toEqual(sizeOf(inline.view));
			expect(back.zoom).toBeCloseTo(inline.zoom, 5);
			expectClear(back, `the petstore in the ${host} after Escape`);
		});
	});
}

test.describe("fullscreen after the reader has moved the map", () => {
	test.use({ viewport: SCREEN });

	test("hands the view back to the fit, which fits the new canvas", async ({
		page,
	}) => {
		const url = await serveModel(page, "northbank");
		await page.goto(`/?url=${encodeURIComponent(url)}`);
		const figure = page.locator("figure.diagram", { hasText: "Context map" });
		await figure.scrollIntoViewIfNeeded();
		const flow = figure.locator(".svelte-flow");
		const inline = await settledFit(flow);
		await flow.getByRole("button", { name: "Zoom In" }).click();
		await flow.getByRole("button", { name: "Zoom In" }).click();
		expect((await settledFit(flow)).zoom).toBeGreaterThan(inline.zoom);

		await drive(flow, page, "click");
		await expectOverlay(flow, page, "after the reader zoomed in");
	});

	test("a window resized while fitted refits, and one the reader moved stays theirs", async ({
		page,
	}) => {
		const url = await serveModel(page, "northbank");
		await page.goto(
			`/?url=${encodeURIComponent(url)}#/boundedcontexts/customer_&_kyc/services/onboarding_app`,
		);
		const figure = page.locator("figure.diagram", {
			hasText: "consumable map",
		});
		await figure.scrollIntoViewIfNeeded();
		const flow = figure.locator(".svelte-flow");
		await settledFit(flow);
		// An editor split dragged narrower: the canvas shrinks and the fit follows.
		await page.setViewportSize({ width: 1100, height: 800 });
		await figure.scrollIntoViewIfNeeded();
		const narrower = await settledFit(flow);
		expectClear(narrower, "OnboardingApp after the window narrowed");
		expectFilled(narrower, "OnboardingApp after the window narrowed");

		await flow.getByRole("button", { name: "Zoom In" }).click();
		const zoomed = await settledFit(flow);
		await page.setViewportSize({ width: 1300, height: 900 });
		await figure.scrollIntoViewIfNeeded();
		const wider = await settledFit(flow);
		// Measured after the canvas took its new width, not before.
		expect(wider.view.right - wider.view.left).toBeGreaterThan(
			zoomed.view.right - zoomed.view.left,
		);
		expect(wider.zoom).toBe(zoomed.zoom);
	});
});
