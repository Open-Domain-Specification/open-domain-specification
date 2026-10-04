import { expect, type Locator, type Page, test } from "@playwright/test";
import { expectClear, expectFilled, settledFit } from "./diagram-fit";
import { openPage } from "./diagram-hosts";
import {
	modelHash,
	REFERENCE_MODELS,
	serveModel,
	WORKSPACE_NAME,
} from "./helpers";

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
 * And the fit fills the canvas it is given (#89): along the axis that binds
 * the graph, nothing is left between it and the canvas's edge, or the panel
 * it clears, but the 12px gutter. It used to keep a tenth of each axis as
 * air, and a map fitted at a quarter of its size could not spare it.
 *
 * Every measurement is of the settled fit (`diagram-fit.ts`): the viewport,
 * the nodes and the panels unchanged for a dozen frames, so a first frame
 * that happens to be right, or wrong, never decides a test.
 */

/** The NorthBank pages the reports were written about, sparse to dense. */
const NORTHBANK = [
	["the workspace", "#", "NorthBank"],
	["the Customer domain", "#/domains/customer", "Customer"],
	[
		"the Ledger subdomain",
		"#/domains/banking_products/subdomains/ledger",
		"Ledger",
	],
	[
		"the Customer & KYC context",
		"#/boundedcontexts/customer_&_kyc",
		"Customer & KYC",
	],
	[
		"the OnboardingApp service",
		"#/boundedcontexts/customer_&_kyc/services/onboarding_app",
		"OnboardingApp",
	],
] as const;

/** The workspace names of the reference models, which the workspace page's heading carries. */
const WORKSPACE_NAMES = {
	petstore: WORKSPACE_NAME,
	rivermart: "RiverMart",
	streamline: "StreamLine",
	"northbank-monolith": "NorthBank",
} as const;

/**
 * A reader's window, an editor split the size of a VS Code tab, and one a
 * little narrower. At 1100x700 Ledger's open legend needs more of the canvas
 * than a strip may take, on any machine's fonts; at 1150x700 it needs exactly
 * the cap on macOS and a pixel more on Linux, where CI found it covering
 * Sovereign Core (legacy).
 */
const SIZES = [
	{ width: 1300, height: 900 },
	{ width: 1150, height: 700 },
	{ width: 1100, height: 700 },
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
		await expect(page.locator("main h1")).toContainText(WORKSPACE_NAMES[model]);
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
			for (const [name, ref, title] of NORTHBANK) {
				test(`every diagram on ${name} fills its canvas clear of every panel`, async ({
					page,
				}) => {
					const url = await serveModel(page, "northbank-monolith");
					await page.goto(`/?url=${encodeURIComponent(url)}${modelHash(ref)}`);
					await expect(page.locator("main h1")).toContainText(title);
					const count = await eachDiagram(page, async (flow, caption) => {
						const fit = await settledFit(flow);
						expectClear(fit, `${caption} at ${at}`);
						expectFilled(fit, `${caption} at ${at}`);
					});
					expect(count).toBeGreaterThan(0);
				});
			}
		});
	}
}

test.describe("the map #89 was reported on", () => {
	test.use({ viewport: { width: 1300, height: 900 } });

	test("OnboardingApp's consumable map reaches both sides of its frame", async ({
		page,
	}) => {
		const url = await serveModel(page, "northbank-monolith");
		await page.goto(
			`/?url=${encodeURIComponent(url)}${modelHash("#/boundedcontexts/customer_&_kyc/services/onboarding_app")}`,
		);
		await expect(page.locator("main h1")).toContainText("OnboardingApp");
		const figure = page.locator("figure.diagram", {
			hasText: "consumable map",
		});
		await figure.scrollIntoViewIfNeeded();
		const fit = await settledFit(figure.locator(".svelte-flow"));
		// It used to span four fifths of the frame's width, a tenth of each
		// side kept as air. Now it reaches the gutter along whichever axis holds
		// it, and spans nearly the whole width either way.
		expectFilled(fit, "OnboardingApp's consumable map");
		const width = fit.view.right - fit.view.left;
		expect((fit.graph.right - fit.graph.left) / width).toBeGreaterThan(0.9);
		expectClear(fit, "OnboardingApp's consumable map");
	});
});

for (const host of ["viewer", "export"] as const) {
	for (const colorScheme of ["light", "dark"] as const) {
		test.describe(`the petstore in the ${host}, ${colorScheme}`, () => {
			test.use({ colorScheme, viewport: { width: 1300, height: 900 } });
			for (const [ref, title] of [
				["#", WORKSPACE_NAME],
				["#/boundedcontexts/sales_bc", "Sales BC"],
			] as const) {
				test(`every diagram at ${ref} fills its canvas clear of every panel`, async ({
					page,
				}) => {
					await openPage(page, host, ref);
					await expect(page.locator("main h1")).toContainText(title);
					const count = await eachDiagram(page, async (flow, caption) => {
						const fit = await settledFit(flow);
						expectClear(fit, `${caption} in the ${host}`);
						expectFilled(fit, `${caption} in the ${host}`);
					});
					expect(count).toBeGreaterThan(0);
				});
			}
		});
	}
}

/** The context map on a NorthBank page, scrolled to. */
async function contextMap(
	page: Page,
	ref: string,
	title: string,
): Promise<Locator> {
	const url = await serveModel(page, "northbank-monolith");
	await page.goto(`/?url=${encodeURIComponent(url)}${modelHash(ref)}`);
	await expect(page.locator("main h1")).toContainText(title);
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
	for (const [name, ref, title] of [
		["Ledger", LEDGER, "Ledger"],
		["the workspace", "#", "NorthBank"],
	] as const) {
		test(`refits ${name}'s map round it, so it never lands on a node`, async ({
			page,
		}) => {
			const flow = await contextMap(page, ref, title);
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
				expectFilled(fit, where);
			}
		});
	}

	test("leaves the reader's own zoom where they put it", async ({ page }) => {
		const flow = await contextMap(page, LEDGER, "Ledger");
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
		const flow = await contextMap(page, LEDGER, "Ledger");
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
