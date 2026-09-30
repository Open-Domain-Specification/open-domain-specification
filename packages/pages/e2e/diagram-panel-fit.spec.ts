import { expect, type Locator, type Page, test } from "@playwright/test";
import { expectClear, settledFit } from "./diagram-fit";
import { openPage } from "./diagram-hosts";
import { REFERENCE_MODELS, serveModel } from "./helpers";

/**
 * The guarantee the fit makes: the whole map is on the canvas and no node is
 * under a floating panel — the legend at the top left, the options panel at
 * the top right, the zoom controls at the bottom left and the minimap at the
 * bottom right. A plain `fitView` knows nothing about any of them and slid a
 * bounded context underneath one (card 20, then #90 for the minimap).
 *
 * When the room runs out something gives way, in one order (card 64,
 * `src/lib/flow/panel-fit.ts`), and the price it cost is the step recorded in
 * the diagram's `data-fit` attribute, which the failure messages carry.
 *
 * Every measurement is of the settled fit (`diagram-fit.ts`): the viewport,
 * the nodes and the panels unchanged for a dozen frames, so a first frame
 * that happens to be right, or wrong, never decides a test.
 */

/** The NorthBank pages the reports were written about, sparse to dense. */
const NORTHBANK = [
	["the workspace", "#"],
	["the Customer domain", "#/domains/customer"],
	["the Ledger subdomain", "#/domains/banking_products/subdomains/ledger"],
	["the Customer & KYC context", "#/boundedcontexts/customer_&_kyc"],
	[
		"the OnboardingApp service",
		"#/boundedcontexts/customer_&_kyc/services/onboarding_app",
	],
] as const;

/** A reader's window, and an editor split the size of a VS Code tab. */
const SIZES = [
	{ width: 1300, height: 900 },
	{ width: 1150, height: 700 },
] as const;

/** Every interactive diagram on the page, each scrolled to before it is measured. */
async function eachDiagram(
	page: Page,
	check: (flow: Locator, caption: string) => Promise<void>,
): Promise<number> {
	await expect(page.locator(".svelte-flow__node").first()).toBeVisible();
	const figures = page.locator("figure.diagram:has(.interactive)");
	const count = await figures.count();
	for (let i = 0; i < count; i += 1) {
		const figure = figures.nth(i);
		await figure.scrollIntoViewIfNeeded();
		const caption = (await figure.locator("figcaption").textContent()) ?? "";
		await check(figure.locator(".svelte-flow"), caption.trim());
	}
	return count;
}

for (const model of REFERENCE_MODELS) {
	test(`the ${model} context map fits clear of every panel`, async ({
		page,
	}) => {
		const url = await serveModel(page, model);
		await page.goto(`/?url=${encodeURIComponent(url)}`);
		const figure = page.locator("figure.diagram", { hasText: "Context map" });
		await figure.scrollIntoViewIfNeeded();
		expectClear(
			await settledFit(figure.locator(".svelte-flow")),
			`the ${model} context map`,
		);
	});
}

for (const colorScheme of ["light", "dark"] as const) {
	for (const size of SIZES) {
		const at = `${size.width}x${size.height}, ${colorScheme}`;
		test.describe(`NorthBank at ${at}`, () => {
			test.use({ colorScheme, viewport: size });
			for (const [name, ref] of NORTHBANK) {
				test(`every diagram on ${name} fits clear of every panel`, async ({
					page,
				}) => {
					const url = await serveModel(page, "northbank");
					await page.goto(`/?url=${encodeURIComponent(url)}${ref}`);
					const count = await eachDiagram(page, async (flow, caption) =>
						expectClear(await settledFit(flow), `${caption} at ${at}`),
					);
					expect(count).toBeGreaterThan(0);
				});
			}
		});
	}
}

for (const host of ["viewer", "export"] as const) {
	for (const colorScheme of ["light", "dark"] as const) {
		test.describe(`the petstore in the ${host}, ${colorScheme}`, () => {
			test.use({ colorScheme, viewport: { width: 1300, height: 900 } });
			for (const ref of ["#", "#/boundedcontexts/sales_bc"]) {
				test(`every diagram at ${ref} fits clear of every panel`, async ({
					page,
				}) => {
					await openPage(page, host, ref);
					const count = await eachDiagram(page, async (flow, caption) =>
						expectClear(await settledFit(flow), `${caption} in the ${host}`),
					);
					expect(count).toBeGreaterThan(0);
				});
			}
		});
	}
}

/** The context map on a NorthBank page, scrolled to. */
async function contextMap(page: Page, ref: string): Promise<Locator> {
	const url = await serveModel(page, "northbank");
	await page.goto(`/?url=${encodeURIComponent(url)}${ref}`);
	const figure = page.locator("figure.diagram", { hasText: "ontext map" });
	await figure.first().scrollIntoViewIfNeeded();
	return figure.first().locator(".svelte-flow");
}

/** Ledger's context map, where the reader's legend covered Sovereign Core (#90). */
const LEDGER = "#/domains/banking_products/subdomains/ledger";

test.describe("a panel the reader opens or closes", () => {
	test.use({ viewport: { width: 1300, height: 900 } });

	// Ledger opens with both panels open; the workspace map opens with the
	// fit having closed both, so the reader's first click opens a deep legend
	// over where the map was drawn.
	for (const [name, ref] of [
		["Ledger", LEDGER],
		["the workspace", "#"],
	] as const) {
		test(`refits ${name}'s map round it, so it never lands on a node`, async ({
			page,
		}) => {
			const flow = await contextMap(page, ref);
			const header = flow.getByRole("button", { name: "Legend" });
			const options = flow.getByRole("button", { name: "Options" });
			expectClear(await settledFit(flow), `${name} as it opens`);
			for (const toggle of [header, options, header, options]) {
				const was = await toggle.getAttribute("aria-expanded");
				await toggle.click();
				await expect(toggle).not.toHaveAttribute("aria-expanded", was ?? "");
				const fit = await settledFit(flow);
				const where = `${name} after ${(await toggle.textContent())?.trim()} went from ${was}`;
				expectClear(fit, where);
			}
		});
	}

	test("leaves the reader's own zoom where they put it", async ({ page }) => {
		const flow = await contextMap(page, LEDGER);
		await settledFit(flow);
		await flow.getByRole("button", { name: "Zoom In" }).click();
		const zoomed = await settledFit(flow);
		await flow.getByRole("button", { name: "Legend" }).click();
		const after = await settledFit(flow);
		expect(after.zoom).toBe(zoomed.zoom);
		expect(after.graph).toEqual(zoomed.graph);
	});

	test("Fit View fits clear of every panel, and hands the view back to the fit", async ({
		page,
	}) => {
		const flow = await contextMap(page, LEDGER);
		const fitted = await settledFit(flow);
		await flow.getByRole("button", { name: "Zoom In" }).click();
		await flow.getByRole("button", { name: "Zoom In" }).click();
		expect((await settledFit(flow)).zoom).toBeGreaterThan(fitted.zoom);
		await flow.getByRole("button", { name: "Fit View" }).click();
		const refitted = await settledFit(flow);
		expectClear(refitted, "Ledger after Fit View");
		expect(refitted.zoom).toBeCloseTo(fitted.zoom, 5);
		// The view is the fit's again: a panel opened now is refitted round.
		await flow.getByRole("button", { name: "Legend" }).click();
		expectClear(await settledFit(flow), "Ledger after Fit View and a legend");
	});
});
