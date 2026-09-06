import { PATTERNS } from "@open-domain-specification/core";
import { expect, test } from "@playwright/test";
import {
	expectNoSidewaysScroll,
	expectProseRow,
	servePetstore,
	viewerAt,
	wrapOf,
} from "./helpers";

/**
 * The relationship detail (RFC-002 card E) in both places it is reached: in
 * the modal a Strategic position row opens, and as its own page.
 */

const SALES_REF = "#/boundedcontexts/sales_bc";
/** The hover text a role code carries, read from core rather than restated. */
const ACL_SUMMARY = PATTERNS["anti-corruption-layer"].summary;
const CATALOG_SALES_REF =
	"#/relationships/catalog_bc~customer-supplier~sales_bc";

test.beforeEach(async ({ page }) => {
	await servePetstore(page);
});

/** An editor tab in the extension: the window this disclosure has to fit. */
const EDITOR_TAB = { width: 1150, height: 700 };

test("a Strategic position row discloses the relationship in a modal that fits an editor tab", async ({
	page,
}) => {
	await page.setViewportSize(EDITOR_TAB);
	await page.goto(viewerAt(SALES_REF));
	await expect(page.locator("main h1")).toContainText("Sales BC");

	const table = page.locator(".strategic-position");
	const toggle = table.getByRole("button", {
		name: "Evidence for Catalog BC and Sales BC",
	});
	await toggle.scrollIntoViewIfNeeded();
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await expect(toggle).toHaveAttribute("aria-controls", "relationship-modal");
	const modal = page.locator("#relationship-modal");
	await expect(modal).toHaveCount(0);
	// The detail is no longer a row of the table.
	await expect(page.locator("tr.detail")).toHaveCount(0);

	await toggle.click();

	await expect(toggle).toHaveAttribute("aria-expanded", "true");
	// A real dialog, named by its title, with focus moved into it.
	await expect(modal).toHaveAttribute("aria-modal", "true");
	await expect(modal).toHaveAttribute("role", "dialog");
	await expect(modal).toBeFocused();
	// The header names the dialog; the content names which relationship, with
	// each end a lockup and the arrow between them in its own element.
	await expect(modal.locator("h2")).toHaveText("Relationship");
	const detail = modal.locator(".relationship-detail");
	await expect(detail.locator("h3").first()).toHaveText(
		/Catalog BC\s+→\s+Sales BC/,
	);
	await expect(detail).toContainText(
		"Sales reads Catalog through PetSummaryClient",
	);
	await expect(page.locator("tr.detail")).toHaveCount(0);
	// A disclosure, not a navigation: the page stays on Sales.
	await expect(page).toHaveURL(new RegExp(`${SALES_REF}$`));

	// Centred over the window, inside it on every side, and the page still
	// visible either side of it rather than covered over.
	const box = await modal.boundingBox();
	const centre = (box?.x ?? 0) + (box?.width ?? 0) / 2;
	expect(Math.abs(centre - EDITOR_TAB.width / 2)).toBeLessThan(2);
	expect(box?.y ?? 0).toBeGreaterThanOrEqual(32);
	expect((box?.y ?? 0) + (box?.height ?? 0)).toBeLessThanOrEqual(
		EDITOR_TAB.height - 32,
	);
	expect(box?.width ?? 0).toBeLessThanOrEqual(960);
	expect(box?.x ?? 0).toBeGreaterThanOrEqual(24);

	// Wide enough to keep the crossings table out of a `DataTable`'s narrow
	// tier: at 880px the panel broke a consumable's icon off its name and gave
	// that row a second line. Counted in lines rather than as a height in
	// pixels, which is only ever the runner's fonts (see `wrapOf`).
	const crossing = modal.locator("#crossings tbody tr").first();
	expect((await wrapOf(crossing)).lines).toBe(1);

	// The size this card is about: a typical relationship reads in an editor
	// tab without the body having to scroll.
	const overflow = await modal
		.locator(".body")
		.evaluate((el) => el.scrollHeight - el.clientHeight);
	expect(overflow).toBe(0);

	// The page it covers is left exactly as it was: nothing reserved, nothing
	// pushed, and the row still where the reader left it.
	expect(
		await page.evaluate(() =>
			Number.parseFloat(getComputedStyle(document.body).paddingBottom),
		),
	).toBe(0);

	await modal.getByRole("button", { name: "Close Relationship" }).click();
	await expect(modal).toHaveCount(0);
	await expect(toggle).toBeFocused();
});

test("Escape closes the modal and puts focus back on the row's toggle", async ({
	page,
}) => {
	await page.goto(viewerAt(SALES_REF));
	const toggle = page.locator(".strategic-position").getByRole("button", {
		name: "Evidence for Catalog BC and Sales BC",
	});
	await toggle.scrollIntoViewIfNeeded();
	await toggle.click();

	const modal = page.locator("#relationship-modal");
	// A comment, the thing a reader opens the row for, read inside the modal.
	await expect(modal.locator("#comments")).toContainText(
		"Sales reads Catalog through PetSummaryClient",
	);
	// Read from inside the modal: focus moves on, and Escape still returns it.
	await modal.getByRole("button", { name: "Close Relationship" }).focus();

	await page.keyboard.press("Escape");

	await expect(modal).toHaveCount(0);
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await expect(toggle).toBeFocused();
});

test("the page behind the modal does not scroll while it is open, and keeps its place after it closes", async ({
	page,
}) => {
	await page.goto(viewerAt(SALES_REF));

	const toggle = page.locator(".strategic-position").getByRole("button", {
		name: "Evidence for Catalog BC and Sales BC",
	});
	await toggle.scrollIntoViewIfNeeded();
	await toggle.click();

	const modal = page.locator("#relationship-modal");
	await expect(modal).toBeVisible();
	// The position the row's own scroll left the page at: this is the position
	// the wheel must not be able to move it from while the modal is open.
	const before = await page.evaluate(() => window.scrollY);

	// Past the end of the modal body: overscroll must not chain to the page.
	await modal.locator(".body").hover();
	await page.mouse.wheel(0, 5000);
	await page.mouse.wheel(0, 5000);
	// Over the scrim, which is not scrollable at all.
	await page.locator(".modal-layer .scrim").hover({ position: { x: 4, y: 4 } });
	await page.mouse.wheel(0, 5000);

	expect(await page.evaluate(() => window.scrollY)).toBe(before);

	await modal.getByRole("button", { name: "Close Relationship" }).click();
	await expect(modal).toHaveCount(0);
	expect(await page.evaluate(() => window.scrollY)).toBe(before);
});

test("a click on the scrim closes the modal", async ({ page }) => {
	await page.goto(viewerAt(SALES_REF));
	const toggle = page.locator(".strategic-position").getByRole("button", {
		name: "Evidence for Catalog BC and Sales BC",
	});
	await toggle.scrollIntoViewIfNeeded();
	await toggle.click();
	const modal = page.locator("#relationship-modal");
	await expect(modal).toBeVisible();

	// The dimmed page: a click on it is the third way out, beside Escape and
	// the close button. Top left, which is scrim wherever the panel sits.
	await page.locator(".modal-layer .scrim").click({ position: { x: 4, y: 4 } });

	await expect(modal).toHaveCount(0);
	await expect(toggle).toBeFocused();
});

test("the Strategic position description reads as prose, not one word a line", async ({
	page,
}) => {
	// Wide enough that the table has width to spare, which is the case this
	// is about: who gets it. An editor tab is about this wide.
	await page.setViewportSize({ width: 1600, height: 900 });
	await page.goto(viewerAt(SALES_REF));
	const description = page.locator(".strategic-position .description").first();
	await description.scrollIntoViewIfNeeded();

	// Disposition is this table's last column, so before the description asked
	// to `grow` the spare width all went there and the description fell to its
	// longest word: 70px and a 177px row, at every viewport width.
	const box = await description.boundingBox();
	expect(box?.width ?? 0).toBeGreaterThan(200);
	// And short, counted in the description's own lines rather than in pixels,
	// which are only ever the runner's fonts (see `expectProseRow`).
	await expectProseRow(description);
});

test("a role code on the Strategic position table discloses the pattern and this row's evidence", async ({
	page,
}) => {
	await page.goto(viewerAt(SALES_REF));
	const table = page.locator(".strategic-position");
	// The code is a hover trigger, not a `title`: a native tooltip could carry
	// neither the disposition mark nor the comment's link.
	const acl = table.getByRole("button", { name: "ACL" }).first();
	await acl.scrollIntoViewIfNeeded();
	await expect(acl).toHaveAttribute("aria-expanded", "false");

	await acl.hover();

	const card = page.locator(".hover-card");
	await expect(card).toContainText("Anti-Corruption Layer");
	await expect(card).toContainText(ACL_SUMMARY);
	// The card teaches the pattern, then discloses this relationship's evidence.
	await expect(card).toContainText(
		"Sales reads Catalog through PetSummaryClient",
	);
	await expect(
		card.getByRole("link", { name: /PetSummaryClient\.ts/ }),
	).toBeVisible();

	await page.keyboard.press("Escape");
	await expect(card).toHaveCount(0);
	await expect(acl).toHaveAttribute("aria-expanded", "false");
});

test("a role code on the relationship page discloses the same card, and the evidence is on the page under it", async ({
	page,
}) => {
	await page.goto(viewerAt(CATALOG_SALES_REF));
	const acl = page.getByRole("button", { name: "ACL" }).first();
	await acl.scrollIntoViewIfNeeded();

	await acl.hover();

	const card = page.locator(".hover-card");
	await expect(card).toContainText(ACL_SUMMARY);
	// A click pins the card, so the pointer can leave it and come back; a
	// click anywhere else closes it again.
	await acl.click();
	// In view already, since a scroll to reach it would close the card first,
	// and not a keyword: the title's own type would open a card of its own.
	const elsewhere = page.locator("aside.toc").getByText("On this page");
	await elsewhere.hover();
	await expect(card).toBeVisible();
	await elsewhere.click();
	await expect(card).toHaveCount(0);

	// The hover is a shortcut, never the only place the evidence lives.
	await expect(page.locator("#comments")).toContainText(
		"Sales reads Catalog through PetSummaryClient",
	);
});

/**
 * A laptop browser with the site tree beside the page: the table has 760px
 * for its six columns, which is the width the design's narrow tier is for.
 */
const BESIDE_THE_TREE = { width: 1300, height: 900 };
/** 24ch at the 13px body size, the floor a prose column keeps. */
const PROSE_FLOOR = 24 * 7;

test("beside the site tree the Strategic position keeps its prose readable, its rows on their first line, and its tokens whole", async ({
	page,
}) => {
	await page.setViewportSize(BESIDE_THE_TREE);
	await page.goto(viewerAt(SALES_REF));
	const table = page.locator(".strategic-position");
	const first = table.locator("tbody tr:not(.group)").first();
	await first.scrollIntoViewIfNeeded();

	// Before the narrow tier the fixed columns took 641 of 760px and the
	// description fell to a word a line: 119px wide, 111px tall.
	const description = await first.locator(".description").boundingBox();
	expect(description?.width ?? 0).toBeGreaterThanOrEqual(PROSE_FLOOR);

	// And the row stays short, said in the description's own lines rather than
	// in pixels, which are only ever the runner's fonts (see `expectProseRow`).
	await expectProseRow(first.locator(".description"));

	// Cells align to the top: the counterpart sits on the description's first
	// line, not at the foot of the row.
	const lockup = await first.locator(".lockup").first().boundingBox();
	expect(Math.abs((lockup?.y ?? 0) - (description?.y ?? 0))).toBeLessThan(4);

	// The flag word drops under its name rather than holding the column
	// open for every row, and the name itself stays on one line. Identity is
	// the petstore's flagged context: boundary-only since card 132, a big ball
	// of mud before that, and the layout rule is the same either way.
	const flagged = table.locator(".context", { hasText: "boundary only" });
	const name = await flagged.locator(".lockup").boundingBox();
	const word = await flagged.locator(".keyword").boundingBox();
	expect(name?.height ?? 0).toBeLessThan(30);
	expect(word?.y ?? 0).toBeGreaterThan((name?.y ?? 0) + 10);

	// Whatever the six columns end up wanting, the sideways scroll stays
	// inside the table's own frame and the page never gains one. How close
	// the columns come to the 760px on offer is a font measurement — wider
	// metrics push them past it and the frame scrolls, which the design
	// permits everywhere (see the test below, and cards 33 and 37) — so it is
	// not something to assert. What the reader is owed is asserted above:
	// prose keeps its floor, the row stays on the description's own lines,
	// cells align to the first line, tokens stay whole, and the page below
	// keeps its single direction of travel.
	await expectNoSidewaysScroll(page);
});

test("narrower still, the Strategic position scrolls inside its own frame and the page never does", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1100, height: 900 });
	await page.goto(viewerAt(SALES_REF));
	const table = page.locator(".strategic-position");
	const first = table.locator("tbody tr:not(.group)").first();
	await first.scrollIntoViewIfNeeded();

	// The prose keeps its floor, so the columns no longer fit 560px.
	const description = await first.locator(".description").boundingBox();
	expect(description?.width ?? 0).toBeGreaterThanOrEqual(PROSE_FLOOR);
	const frame = table.locator(".frame");
	expect(
		await frame.evaluate((el) => el.scrollWidth - el.clientWidth),
	).toBeGreaterThan(0);
	await expectNoSidewaysScroll(page);
});

test("beside the site tree the pattern card stays inside the viewport, opens above a word near the bottom, and closes on scroll", async ({
	page,
}) => {
	await page.setViewportSize(BESIDE_THE_TREE);
	await page.goto(viewerAt(SALES_REF));
	const table = page.locator(".strategic-position");
	const acl = table.getByRole("button", { name: "ACL" }).first();
	await acl.scrollIntoViewIfNeeded();

	// The code sits at x≈869 and the card is ≈490px wide: before the clamp it
	// ran 60px past the edge. It shifts left rather than flipping, so its
	// left edge stays as near the word as the viewport allows.
	await acl.hover();
	const card = page.locator(".hover-card");
	await expect(card).toContainText(ACL_SUMMARY);
	const box = await card.boundingBox();
	const word = await acl.boundingBox();
	expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(
		BESIDE_THE_TREE.width - 8,
	);
	expect(box?.x ?? 0).toBeLessThanOrEqual(word?.x ?? 0);
	expect(box?.y ?? 0).toBeGreaterThan(word?.y ?? 0);

	// Scrolling closes it, as the editor's hover goes when its line moves.
	await page.mouse.wheel(0, 40);
	await expect(card).toHaveCount(0);

	// A word near the bottom of the viewport opens its card above itself: in a
	// 600px window the last row sits about 50px from the bottom edge.
	await page.setViewportSize({ ...BESIDE_THE_TREE, height: 600 });
	await page.evaluate(() => window.scrollTo(0, 0));
	const low = table.getByRole("button", { name: "separate-ways" });
	await low.hover();
	await expect(card).toBeVisible();
	const above = await card.boundingBox();
	const anchor = await low.boundingBox();
	expect((above?.y ?? 0) + (above?.height ?? 0)).toBeLessThanOrEqual(
		anchor?.y ?? 0,
	);
	expect(above?.y ?? 0).toBeGreaterThanOrEqual(8);
});

test("a relationship ref opens the relationship as its own page", async ({
	page,
}) => {
	await page.goto(viewerAt(CATALOG_SALES_REF));

	// v2 drops the uppercase kind at the end of the trail; the title says what
	// this is by naming both contexts with the arrow between them.
	await expect(page.locator("main .crumbs")).toHaveText(
		"Swagger Petstore (v3)›Catalog BC›Sales BC",
	);
	await expect(page.locator("main h1")).toContainText("Catalog BC → Sales BC");
	await expect(page.locator("main")).toContainText(
		"Sales reads Catalog through PetSummaryClient",
	);
	// The table of contents points at the detail's own blocks.
	await expect(
		page.locator("aside.toc").getByRole("link", { name: "Comments" }),
	).toBeVisible();

	// Its crumbs lead back to both contexts it joins.
	await page.locator(`main .crumbs a[data-ref="${SALES_REF}"]`).click();
	await expect(page.locator("main h1")).toContainText("Sales BC");
});
