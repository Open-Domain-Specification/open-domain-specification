import { expect, type Page, test } from "@playwright/test";
import { modelHash } from "./helpers";
import {
	type NorthbankExport,
	openNorthbank,
	READING_HOSTS,
	startNorthbankExport,
} from "./reading-hosts";

/**
 * The current row stays in view in the tree (#91). NorthBank's tree is longer
 * than the window, so a page far down it, opened by a deep link or reached by
 * a route change, used to leave its row below the fold of the sidebar. The row
 * the reader is on must lie inside the sidebar's own scroll viewport; when the
 * page has no row of its own (an invariant), the deepest row on its path
 * stands in, and the tree still marks nothing `aria-current` for it. Only the
 * tree may scroll, and the page heading keeps the focus it had.
 */

const CARD = "#/boundedcontexts/cards/aggregates/card";
const TEAM = "#/teams/digital_platform_team";
const PAN_LUHN_VALID =
	"#/boundedcontexts/cards/valueobjects/pan/invariants/pan_luhn_valid";
const CARDS = "#/boundedcontexts/cards";

type Scenario = {
	name: string;
	ref: string;
	/** The row aria-current marks, or null when the page has no row of its own. */
	exact: string | null;
	/** The row that has to be seen: the page's own, or the deepest on its path. */
	seen: string;
};

const SCENARIOS: Scenario[] = [
	{ name: "an aggregate below the fold", ref: CARD, exact: CARD, seen: CARD },
	{ name: "a later team", ref: TEAM, exact: TEAM, seen: TEAM },
	{
		name: "an invariant with no row, under Cards",
		ref: PAN_LUHN_VALID,
		exact: null,
		seen: CARDS,
	},
];

let site: NorthbankExport;
test.beforeAll(async () => {
	site = await startNorthbankExport();
});
test.afterAll(async () => {
	await site.stop();
});

test.use({ viewport: { width: 1300, height: 900 } });

type Reading = {
	hash: string;
	scrollY: number;
	pageScrollTop: number;
	navScrollTop: number;
	exact: { href: string | null; inside: boolean }[];
	seen: { href: string | null; inside: boolean } | null;
	current: number;
	focus: { tag: string | undefined; inHeading: boolean; inTree: boolean };
};

/** Where the tree's rows are against the sidebar's scroll viewport, and what is focused. */
const read = (page: Page, seenRef: string): Promise<Reading> =>
	page.evaluate((seenHref) => {
		const nav = document.querySelector(".site-nav") as HTMLElement;
		const tree = document.querySelector("nav.tree") as HTMLElement;
		const clipTop = nav.getBoundingClientRect().top + nav.clientTop;
		const clipBottom = clipTop + nav.clientHeight;
		const inside = (el: Element) => {
			const r = el.getBoundingClientRect();
			return (
				r.height > 0 && r.top >= clipTop - 0.5 && r.bottom <= clipBottom + 0.5
			);
		};
		const marked = [...tree.querySelectorAll('[aria-current="page"]')];
		const seen = [...tree.querySelectorAll("a")].find(
			(a) => decodeURIComponent(a.getAttribute("href") ?? "") === seenHref,
		);
		const at = document.activeElement;
		return {
			hash: location.hash,
			scrollY: window.scrollY,
			pageScrollTop: document.scrollingElement?.scrollTop ?? 0,
			navScrollTop: nav.scrollTop,
			exact: marked.map((a) => ({
				href: a.getAttribute("href"),
				inside: inside(a),
			})),
			seen: seen
				? { href: seen.getAttribute("href"), inside: inside(seen) }
				: null,
			current: document.querySelectorAll('[aria-current="page"]').length,
			focus: {
				tag: at?.tagName,
				inHeading: !!at?.matches("main h1"),
				inTree: !!at?.closest("nav.tree"),
			},
		};
	}, seenRef);

const decoded = (href: string | null) => decodeURIComponent(href ?? "");

for (const colorScheme of ["light", "dark"] as const) {
	test.describe(`${colorScheme} theme`, () => {
		test.use({ colorScheme });
		for (const host of READING_HOSTS) {
			test.describe(host, () => {
				for (const scenario of SCENARIOS) {
					for (const how of ["deep link", "route change"] as const) {
						test(`${scenario.name}: the current row is in the tree's viewport after a ${how}`, async ({
							page,
						}) => {
							if (how === "deep link") {
								await openNorthbank(page, host, scenario.ref, site);
							} else {
								await openNorthbank(page, host, "", site);
								await page.locator("nav.tree a").first().waitFor();
								await page.evaluate((hash) => {
									location.hash = hash;
								}, modelHash(scenario.ref));
								await page.waitForFunction(
									() => document.activeElement?.matches("main h1") ?? false,
								);
							}
							await expect
								.poll(
									async () => (await read(page, scenario.seen)).seen?.inside,
									{
										message:
											"the row to be seen sits inside the sidebar viewport",
									},
								)
								.toBe(true);
							// Let a smooth scroll finish before reading what it left.
							await expect
								.poll(
									async () => {
										const a = (await read(page, scenario.seen)).navScrollTop;
										await page.waitForTimeout(150);
										return (await read(page, scenario.seen)).navScrollTop === a;
									},
									{ message: "the tree stopped scrolling" },
								)
								.toBe(true);

							const now = await read(page, scenario.seen);
							expect(decoded(now.hash)).toBe(scenario.ref);
							expect(now.seen?.inside, "row inside the sidebar viewport").toBe(
								true,
							);
							expect(now.navScrollTop, "the tree scrolled").toBeGreaterThan(0);
							if (scenario.exact === null) {
								expect(now.exact, "no ancestor is marked as the page").toEqual(
									[],
								);
								expect(now.current).toBe(0);
							} else {
								expect(now.exact).toHaveLength(1);
								expect(decoded(now.exact[0].href)).toBe(scenario.exact);
								expect(now.exact[0].inside).toBe(true);
								expect(now.current).toBe(1);
							}
							// Only the tree moved: not the document, and focus is the page's.
							expect(now.scrollY).toBe(0);
							expect(now.pageScrollTop).toBe(0);
							expect(now.focus.inTree).toBe(false);
							expect(now.focus.inHeading).toBe(how === "route change");
							if (how === "deep link") expect(now.focus.tag).toBe("BODY");
						});
					}
				}
			});
		}
	});
}

test.describe("reduced motion", () => {
	/** Records how each scroll the sidebar's own container is asked to make is asked for. */
	const spy = (page: Page) =>
		page.addInitScript(() => {
			const asked: { top: number | undefined; behavior: unknown }[] = [];
			(window as unknown as { treeScrolls: unknown }).treeScrolls = asked;
			const original = Element.prototype.scrollTo;
			Element.prototype.scrollTo = function (
				this: Element,
				...args: unknown[]
			) {
				if (this.matches(".site-nav")) {
					const o = args[0] as ScrollToOptions;
					asked.push({ top: o?.top, behavior: o?.behavior });
				}
				return (original as (...a: unknown[]) => void).apply(this, args);
			};
		});
	const asked = (page: Page) =>
		page.evaluate(
			() =>
				(
					window as unknown as {
						treeScrolls: { top: number; behavior: string }[];
					}
				).treeScrolls,
		);

	for (const [motion, behavior] of [
		["reduce", "auto"],
		["no-preference", "smooth"],
	] as const) {
		test(`prefers-reduced-motion ${motion}: the tree is scrolled with behavior ${behavior}`, async ({
			page,
		}) => {
			await page.emulateMedia({ reducedMotion: motion });
			await spy(page);
			await openNorthbank(page, "viewer", CARD, site);
			await expect
				.poll(async () => (await asked(page)).length)
				.toBeGreaterThan(0);
			expect((await asked(page)).map((a) => a.behavior)).toEqual([behavior]);
			await expect
				.poll(async () => (await read(page, CARD)).seen?.inside)
				.toBe(true);
			expect((await read(page, CARD)).scrollY).toBe(0);
		});
	}
});
