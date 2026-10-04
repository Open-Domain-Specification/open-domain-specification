import { expect, type Page, test } from "@playwright/test";
import {
	expectNoSidewaysScroll,
	modelHash,
	PETSTORE_URL,
	serveModel,
	servePetstore,
} from "./helpers";

/**
 * Reading on a phone (#82). At 900px and narrower the page comes first: the
 * workspace tree is one disclosure button above it, collapsed until the reader
 * opens it, and opens inside its own bounded scroller with the page beneath.
 * Above 900px the persistent sidebar is unchanged. An invariant page, whose
 * empty guard sentence used to be one unbreakable line, never makes the
 * document scroll sideways.
 *
 * All input is the reader's: real Tab, Enter, Space, Escape and clicks. Focus
 * is never placed by script.
 */

const PAN_LUHN_VALID =
	"#/boundedcontexts/cards/valueobjects/pan/invariants/pan_luhn_valid";
const CARDS = "#/boundedcontexts/cards";
/** The team the baseline recorded; teams close the tree, so its row sits far down it. */
const TEAM = "#/teams/customer_platform_team";
const PHONE = { width: 390, height: 844 };

/** The reader's accessible name, matched whole: a glyph or extra text in it is a failure, not something to strip. */
const toggle = (page: Page) =>
	page.getByRole("button", { name: "Workspace tree", exact: true });
const tree = (page: Page) => page.locator("#site-tree");

async function openNorthbank(page: Page, ref: string) {
	const url = await serveModel(page, "northbank");
	await page.goto(`/?url=${encodeURIComponent(url)}${modelHash(ref)}`);
	// Fail fast: a page that never rendered is a setup fault, not a finding.
	await page.locator("main h1").waitFor({ timeout: 10_000 });
}

async function openPetstore(page: Page) {
	await servePetstore(page);
	await page.goto(`/?url=${encodeURIComponent(PETSTORE_URL)}`);
	await page.locator("main h1").waitFor({ timeout: 10_000 });
}

/** Real Tabs from the top of the page until the disclosure button has focus. */
async function tabToButton(page: Page) {
	for (let presses = 0; presses < 4; presses++) {
		await page.keyboard.press("Tab");
		if (await toggle(page).evaluate((el) => el === document.activeElement))
			return;
	}
	throw new Error("Tab never reached the Workspace tree button");
}

const activeIs = (page: Page, selector: string) =>
	page.evaluate((s) => document.activeElement?.matches(s) ?? false, selector);

for (const size of [PHONE, { width: 320, height: 640 }]) {
	test.describe(`${size.width}px wide`, () => {
		test.use({ viewport: size });

		test("an invariant page reads without sideways scroll, with its heading in the first screen and the tree closed", async ({
			page,
		}) => {
			await openNorthbank(page, PAN_LUHN_VALID);
			await expectNoSidewaysScroll(page);
			await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
			await expect(toggle(page)).toHaveAttribute("aria-controls", "site-tree");
			await expect(tree(page)).toBeHidden();
			await expect(page.locator("nav.tree")).toHaveCount(1);
			// The chevron is decoration: the name is the words and nothing else.
			await expect(toggle(page)).toHaveCount(1);
			await expect(toggle(page)).toMatchAriaSnapshot(
				'- button "Workspace tree"',
			);
			const heading = await page.locator("main h1").boundingBox();
			expect(heading).not.toBeNull();
			expect((heading?.y ?? 0) + (heading?.height ?? 0)).toBeLessThanOrEqual(
				size.height,
			);
			// The empty guard sentence wraps as prose rather than running past the edge.
			const sentence = page.locator("#guards .empty");
			await expect(sentence).toBeVisible();
			const box = await sentence.boundingBox();
			expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(size.width);
		});

		test("Tab reaches the button; Enter opens the tree on the current row's ancestor without moving the page; Escape closes it back to the button", async ({
			page,
		}) => {
			await openNorthbank(page, PAN_LUHN_VALID);
			await tabToButton(page);
			await page.keyboard.press("Enter");
			await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
			await expect(tree(page)).toBeVisible();
			await expect(page.locator("nav.tree")).toHaveCount(1);
			await expect(toggle(page)).toHaveCount(1);
			await expect(toggle(page)).toMatchAriaSnapshot(
				'- button "Workspace tree" [expanded]',
			);
			// The invariant has no row; the context it lives in does, and is seen
			// inside the tree's own scroller.
			const inside = await page.evaluate((cards) => {
				const box = document.getElementById("site-tree") as HTMLElement;
				const row = box.querySelector(`a[data-ref="${cards}"]`) as HTMLElement;
				const b = box.getBoundingClientRect();
				const r = row.getBoundingClientRect();
				return {
					seen: r.top >= b.top - 0.5 && r.bottom <= b.bottom + 0.5,
					scrollable: box.scrollHeight > box.clientHeight,
					scrollY: window.scrollY,
				};
			}, CARDS);
			expect(inside.seen).toBe(true);
			expect(inside.scrollable).toBe(true);
			expect(inside.scrollY).toBe(0);
			// Opened, the tree still leaves the page beneath it in this screen.
			const bottom = await tree(page).evaluate(
				(el) => el.getBoundingClientRect().bottom,
			);
			expect(bottom).toBeLessThan(size.height);
			await expectNoSidewaysScroll(page);

			await page.keyboard.press("Escape");
			await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
			await expect(tree(page)).toBeHidden();
			expect(await activeIs(page, "#site-tree-toggle")).toBe(true);
			// Space opens it again, as a native button does.
			await page.keyboard.press("Space");
			await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
			// Escape from a row inside the tree closes it too.
			await page.keyboard.press("Tab");
			expect(await activeIs(page, "#site-tree a")).toBe(true);
			await page.keyboard.press("Escape");
			await expect(tree(page)).toBeHidden();
			expect(await activeIs(page, "#site-tree-toggle")).toBe(true);
		});

		test("choosing a row navigates, closes the tree and lands focus on the page heading", async ({
			page,
		}) => {
			await openNorthbank(page, PAN_LUHN_VALID);
			await toggle(page).click();
			await expect(tree(page)).toBeVisible();
			const row = tree(page).locator(`a[data-ref="${CARDS}"]`);
			await row.click();
			await expect
				.poll(() => page.evaluate(() => location.hash))
				.toBe(modelHash(CARDS));
			await expect(tree(page)).toBeHidden();
			await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
			await expect.poll(() => activeIs(page, "main h1")).toBe(true);
			// Back returns to the invariant: the route is in history.
			await page.goBack();
			await expect
				.poll(() => page.evaluate(() => location.hash))
				.toBe(modelHash(PAN_LUHN_VALID));
			await expectNoSidewaysScroll(page);
		});
	});
}

test.describe("a row the router leaves to the browser", () => {
	test.use({ viewport: PHONE });

	test("a Control or Command click on a row keeps the tree open, the page where it was and the row in view", async ({
		page,
		context,
	}) => {
		// The browser may open the link in a tab of its own; none is wanted here.
		const opened: Page[] = [];
		context.on("page", (tab) => opened.push(tab));
		await openNorthbank(page, PAN_LUHN_VALID);
		await tabToButton(page);
		await page.keyboard.press("Enter");
		await expect(tree(page)).toBeVisible();
		const row = tree(page).locator(`a[data-ref="${CARDS}"]`);
		const hash = await page.evaluate(() => location.hash);
		await row.click({ modifiers: ["ControlOrMeta"] });
		await expect(toggle(page)).toHaveAttribute("aria-expanded", "true");
		await expect(tree(page)).toBeVisible();
		expect(await page.evaluate(() => location.hash)).toBe(hash);
		// The row the reader pressed still has focus, and is not out of sight.
		expect(await activeIs(page, `#site-tree a[data-ref="${CARDS}"]`)).toBe(
			true,
		);
		await expect(row).toBeInViewport();
		await expect(page.locator("main h1")).toContainText("pan_luhn_valid");
		for (const tab of opened) await tab.close();
	});
});

test.describe("the breakpoint", () => {
	test("wide shows the persistent tree and no button; 900 shows the button and 901 does not; resizing never takes the reader's focus", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 1300, height: 900 });
		await openPetstore(page);
		await expect(toggle(page)).toHaveCount(0);
		await expect(page.locator("nav.tree")).toBeVisible();
		await expect(page.locator(".site-nav")).toHaveCSS("position", "sticky");

		await page.setViewportSize({ width: 901, height: 900 });
		await expect(toggle(page)).toHaveCount(0);
		await expect(page.locator("nav.tree")).toBeVisible();
		await page.setViewportSize({ width: 900, height: 900 });
		await expect(toggle(page)).toBeVisible();
		await expect(tree(page)).toBeHidden();

		// A reader on the page heading keeps it across a resize either way.
		await page.keyboard.press("Tab");
		expect(await activeIs(page, "a.skip")).toBe(true);
		await page.keyboard.press("Enter");
		expect(await activeIs(page, "main h1")).toBe(true);
		await page.setViewportSize({ width: 1300, height: 900 });
		await expect(toggle(page)).toHaveCount(0);
		expect(await activeIs(page, "main h1")).toBe(true);
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(toggle(page)).toHaveAttribute("aria-expanded", "false");
		expect(await activeIs(page, "main h1")).toBe(true);
	});

	test("a reader in the open tree is not left on a hidden row: widening keeps them in the visible tree, narrowing puts focus on the button", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await openPetstore(page);
		await tabToButton(page);
		await page.keyboard.press("Enter");
		await page.keyboard.press("Tab");
		expect(await activeIs(page, "#site-tree a")).toBe(true);
		const focused = await page.evaluate(
			() => document.activeElement?.getAttribute("href") ?? "",
		);
		await page.setViewportSize({ width: 1300, height: 900 });
		await expect(tree(page)).toBeVisible();
		expect(
			await page.evaluate(
				() => document.activeElement?.getAttribute("href") ?? "",
			),
		).toBe(focused);
		await page.setViewportSize({ width: 390, height: 844 });
		await expect(tree(page)).toBeHidden();
		expect(await activeIs(page, "#site-tree-toggle")).toBe(true);
	});

	test("a deep team's row stays in view in the tree's own scroller when the tree is opened and the window then widens", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await openNorthbank(page, TEAM);
		await tabToButton(page);
		await page.keyboard.press("Enter");
		await expect(tree(page)).toBeVisible();

		/** Where the current row lies against the scroller that holds the tree, and the document's own scroll. */
		const place = (scroller: string) =>
			page.evaluate(
				({ scroller, team }) => {
					const box = document.querySelector(scroller) as HTMLElement;
					const row = box.querySelector(`a[data-ref="${team}"]`) as HTMLElement;
					const clipTop = box.getBoundingClientRect().top + box.clientTop;
					const clipBottom = clipTop + box.clientHeight;
					const r = row.getBoundingClientRect();
					return {
						seen:
							r.height > 0 &&
							r.top >= clipTop - 0.5 &&
							r.bottom <= clipBottom + 0.5,
						scrolled: box.scrollTop,
						scrollY: window.scrollY,
						focus:
							document.activeElement?.getAttribute("data-ref") ??
							document.activeElement?.id ??
							null,
					};
				},
				{ scroller, team: TEAM },
			);

		const opened = await place("#site-tree");
		// The team is far enough down that revealing it took a scroll of the tree.
		expect(opened.scrolled).toBeGreaterThan(0);
		expect(opened.seen).toBe(true);
		expect(opened.scrollY).toBe(0);
		expect(opened.focus).toBe("site-tree-toggle");

		await page.setViewportSize({ width: 1300, height: 900 });
		await expect(toggle(page)).toHaveCount(0);
		await expect.poll(async () => (await place(".site-nav")).seen).toBe(true);
		const wide = await place(".site-nav");
		expect(wide.scrollY).toBe(0);
		// The button is gone, so focus stays in the tree, on the reader's own row.
		expect(wide.focus).toBe(TEAM);
	});
});

test.describe("the breakpoint under reduced motion", () => {
	// With less motion asked for, the page still styles the new layout one frame
	// after the breakpoint is crossed, so the row is only measured truly once that
	// layout has settled.
	test.beforeEach(async ({ page }) => {
		await page.emulateMedia({ reducedMotion: "reduce" });
		// The preference is really the page's, not assumed.
		expect(
			await page.evaluate(
				() => matchMedia("(prefers-reduced-motion: reduce)").matches,
			),
		).toBe(true);
	});

	/** Whether the current row lies wholly inside the scroller that holds the tree, and where focus and the document are. */
	const place = (page: Page, scroller: string) =>
		page.evaluate(
			({ scroller, team }) => {
				const box = document.querySelector(scroller) as HTMLElement;
				const row = box.querySelector(`a[data-ref="${team}"]`) as HTMLElement;
				const clipTop = box.getBoundingClientRect().top + box.clientTop;
				const clipBottom = clipTop + box.clientHeight;
				const r = row.getBoundingClientRect();
				return {
					seen:
						r.height > 0 &&
						r.top >= clipTop - 0.5 &&
						r.bottom <= clipBottom + 0.5,
					scrollY: window.scrollY,
					focus:
						document.activeElement?.getAttribute("data-ref") ??
						document.activeElement?.id ??
						document.activeElement?.tagName ??
						null,
				};
			},
			{ scroller, team: TEAM },
		);

	/** The sidebar once the window is wide: no button, and its own scroller showing the row. */
	async function widen(page: Page, width: number) {
		await page.setViewportSize({ width, height: 900 });
		await expect(toggle(page)).toHaveCount(0);
		await expect(page.locator(".site-nav")).toHaveCSS("position", "sticky");
		// The padding that changes with the layout takes its final value before the row is measured.
		await expect(page.locator(".site-nav")).toHaveCSS("padding-top", "12px");
	}

	for (const width of [901, 1300]) {
		test(`a reader who opened the tree at 390 has the deep team's row wholly inside the sidebar at ${width}, with focus on that row`, async ({
			page,
		}) => {
			await page.setViewportSize({ width: 390, height: 844 });
			await openNorthbank(page, TEAM);
			await tabToButton(page);
			await page.keyboard.press("Enter");
			await expect(tree(page)).toBeVisible();
			expect((await place(page, "#site-tree")).seen).toBe(true);

			await widen(page, width);
			await expect
				.poll(async () => (await place(page, ".site-nav")).focus)
				.toBe(TEAM);
			const wide = await place(page, ".site-nav");
			expect(wide.seen).toBe(true);
			expect(wide.scrollY).toBe(0);
		});
	}

	test("a reader whose focus is on the page, not the tree, has the row wholly inside the sidebar when it widens and keeps their focus", async ({
		page,
	}) => {
		await page.setViewportSize({ width: 390, height: 844 });
		await openNorthbank(page, TEAM);
		await toggle(page).click();
		await expect(tree(page)).toBeVisible();
		// A reader who then reads on: their focus is the page's heading.
		await page.locator("main h1").click();
		expect(await activeIs(page, "main h1")).toBe(true);

		await widen(page, 1300);
		await expect
			.poll(async () => (await place(page, ".site-nav")).seen)
			.toBe(true);
		expect(await activeIs(page, "main h1")).toBe(true);
		expect((await place(page, ".site-nav")).scrollY).toBe(0);
	});
});
