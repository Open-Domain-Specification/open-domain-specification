import { expect, type Page, test } from "@playwright/test";
import { modelHash, servePetstore, viewerAt } from "./helpers";
import { onScreen } from "./on-screen";
import {
	type NorthbankExport,
	openNorthbank,
	READING_HOSTS,
	startNorthbankExport,
} from "./reading-hosts";

/**
 * Skip to content (#83): from a fresh, unfocused load the first Tab in the
 * viewer and the static export lands on a link that carries a reader past the
 * workspace tree. Activating it must not behave like the hash router's own
 * links: the route, the hash and the history stay exactly as they were, and
 * focus goes to the page's heading, so the next Tab is the first stop after it.
 * Every key is a real key press.
 */

const CUSTOMER = "#/boundedcontexts/customer_&_kyc";

let site: NorthbankExport;
test.beforeAll(async () => {
	site = await startNorthbankExport();
});
test.afterAll(async () => {
	await site.stop();
});

/** What a Tab from the top of the page should have reached: the first stop after the heading. */
const nextStopAfterHeading = (page: Page) =>
	page.evaluate(() => {
		const h1 = document.querySelector("main h1") as HTMLElement;
		const stops = [
			...document.querySelectorAll<HTMLElement>(
				"a[href], button, select, input, textarea, [tabindex]:not([tabindex='-1'])",
			),
		].filter(
			(el) =>
				!(el as HTMLButtonElement).disabled &&
				el.getClientRects().length > 0 &&
				getComputedStyle(el).visibility !== "hidden" &&
				!!(h1.compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING),
		);
		return {
			expected: stops[0] ? stops[0].outerHTML.slice(0, 200) : null,
			actual: (document.activeElement as HTMLElement).outerHTML.slice(0, 200),
		};
	});

const routes = [
	{ name: "the workspace", ref: "" },
	{ name: "a bounded context", ref: CUSTOMER },
];

for (const host of READING_HOSTS) {
	test.describe(host, () => {
		for (const route of routes) {
			test(`${route.name}: the first Tab is Skip to content, and Enter keeps the route and focuses the heading`, async ({
				page,
			}) => {
				await openNorthbank(page, host, route.ref, site);
				expect(await page.evaluate(() => document.activeElement?.tagName)).toBe(
					"BODY",
				);
				const hash = await page.evaluate(() => location.hash);
				const length = await page.evaluate(() => history.length);

				await page.keyboard.press("Tab");
				const skip = page.getByRole("link", { name: "Skip to content" });
				await expect(skip).toBeFocused();
				// It is the first focusable element, and it is seen once it has focus.
				expect(
					await skip.evaluate(
						(el) =>
							document.querySelector("a[href], button, select, input") === el,
					),
				).toBe(true);
				await onScreen(skip, "the focused skip link");
				// Its target is the route being read, never an anchor id the router
				// would take for the workspace root.
				await expect(skip).toHaveAttribute("href", hash || "#");

				await page.keyboard.press("Enter");
				await expect(page.locator("main h1")).toBeFocused();
				expect(await page.evaluate(() => location.hash)).toBe(hash);
				expect(await page.evaluate(() => history.length)).toBe(length);

				await page.keyboard.press("Tab");
				const { expected, actual } = await nextStopAfterHeading(page);
				expect(actual).toBe(expected);
			});
		}
	});
}

test("viewer, petstore: a page deep in the model has the same first stop", async ({
	page,
}) => {
	await servePetstore(page);
	await page.goto(viewerAt("#/boundedcontexts/sales_bc"));
	await expect(page.locator("main h1")).toContainText("Sales BC");
	const hash = await page.evaluate(() => location.hash);
	expect(hash).toBe(modelHash("#/boundedcontexts/sales_bc"));

	await page.keyboard.press("Tab");
	const skip = page.getByRole("link", { name: "Skip to content" });
	await expect(skip).toBeFocused();
	await expect(skip).toHaveAttribute("href", hash);
	await page.keyboard.press("Enter");
	await expect(page.locator("main h1")).toBeFocused();
	expect(await page.evaluate(() => location.hash)).toBe(hash);
});

test("the skip link is hidden until it has focus, and the next Tab leaves it for the tree", async ({
	page,
}) => {
	await openNorthbank(page, "viewer", "", site);
	const skip = page.getByRole("link", { name: "Skip to content" });
	const resting = await skip.boundingBox();
	expect(resting && resting.width <= 1 && resting.height <= 1).toBe(true);

	await page.keyboard.press("Tab");
	await expect(skip).toBeFocused();
	const focused = await skip.boundingBox();
	expect(focused && focused.width > 40 && focused.height > 10).toBe(true);

	await page.keyboard.press("Tab");
	await expect(page.locator("nav.tree a").first()).toBeFocused();
});

// The per-diagram bypass (#83) in every family, from the keyboard.

type Family = { family: string; ref: string; caption: string };
const FAMILIES: Family[] = [
	{ family: "context", ref: "", caption: "Context map" },
	{ family: "consumable", ref: CUSTOMER, caption: "consumable map" },
	{ family: "flow", ref: CUSTOMER, caption: "flow map" },
	{
		family: "relation",
		ref: "#/boundedcontexts/accounts/aggregates/account",
		caption: "relation map",
	},
];

/** Puts the reader's place just before the figure, so that Tab carries them in. */
const arrive = (page: Page, caption: string) =>
	page
		.locator("figure.diagram", { hasText: caption })
		.first()
		.evaluate((figure) => {
			figure.scrollIntoView();
			figure.tabIndex = -1;
			figure.focus();
		});

for (const host of READING_HOSTS) {
	test.describe(`${host}: every diagram opens with a bypass`, () => {
		for (const { family, ref, caption } of FAMILIES) {
			test(`${family} map: the first Tab stop inside is the bypass, and Enter lands on the caption with the next Tab beyond the figure`, async ({
				page,
			}) => {
				await openNorthbank(page, host, ref, site);
				const figure = page
					.locator("figure.diagram", { hasText: caption })
					.first();
				await expect(
					figure.locator(".svelte-flow__node").first(),
				).toBeVisible();
				await arrive(page, caption);

				await page.keyboard.press("Tab");
				const bypass = figure.locator("button.bypass");
				await expect(bypass).toBeFocused();
				await expect(bypass).toHaveText(/^Skip diagram: .*map/i);
				// Nothing in the figure comes before it in the Tab order.
				expect(
					await figure.evaluate(
						(el) =>
							el.querySelector(
								"a[href], button, select, input, [tabindex]:not([tabindex='-1'])",
							) === el.querySelector("button.bypass"),
					),
				).toBe(true);
				await onScreen(bypass, "the focused bypass");

				await page.keyboard.press("Enter");
				const captionEl = figure.locator("figcaption");
				await expect(captionEl).toBeFocused();
				await onScreen(captionEl, "the caption the bypass landed on");

				await page.keyboard.press("Tab");
				const next = await page.evaluate(() => {
					const el = document.activeElement as HTMLElement;
					const b = el.getBoundingClientRect();
					const hit = document.elementFromPoint(
						b.left + b.width / 2,
						b.top + b.height / 2,
					);
					return {
						inFigure: !!el.closest("figure.diagram"),
						visible: !!hit && el.contains(hit),
					};
				});
				expect(next.inFigure).toBe(false);
				expect(next.visible).toBe(true);
			});
		}

		test("Space activates it too", async ({ page }) => {
			await openNorthbank(page, host, CUSTOMER, site);
			const figure = page
				.locator("figure.diagram", { hasText: "flow map" })
				.first();
			await arrive(page, "flow map");
			await page.keyboard.press("Tab");
			await expect(figure.locator("button.bypass")).toBeFocused();
			await page.keyboard.press(" ");
			await expect(figure.locator("figcaption")).toBeFocused();
		});

		test("in fullscreen the bypass is still there, and one activation leaves the overlay and lands on the visible caption", async ({
			page,
		}) => {
			await openNorthbank(page, host, CUSTOMER, site);
			const figure = page
				.locator("figure.diagram", { hasText: "flow map" })
				.first();
			const overlay = page.locator(".interactive.fullscreen");
			await figure.scrollIntoViewIfNeeded();
			await figure.getByRole("button", { name: "Enter fullscreen" }).focus();
			await page.keyboard.press("Enter");
			await expect(overlay).toHaveCount(1);

			// Back through the map's own stops to the first of them, inside the overlay.
			const bypass = figure.locator("button.bypass");
			let reached = false;
			for (let presses = 0; presses < 60 && !reached; presses++) {
				await page.keyboard.press("Shift+Tab");
				reached = await bypass.evaluate((el) => el === document.activeElement);
			}
			expect(reached).toBe(true);
			await onScreen(bypass, "the bypass inside the overlay");
			await expect(overlay).toHaveCount(1);

			await page.keyboard.press("Enter");
			await expect(overlay).toHaveCount(0);
			const captionEl = figure.locator("figcaption");
			await expect(captionEl).toBeFocused();
			await onScreen(captionEl, "the caption after leaving fullscreen");

			await page.keyboard.press("Tab");
			expect(
				await page.evaluate(
					() => !document.activeElement?.closest("figure.diagram"),
				),
			).toBe(true);
		});
	});
}
