import { PATTERNS } from "@open-domain-specification/core";
import { expect, test } from "@playwright/test";
import { servePetstore, viewerAt } from "./helpers";

/**
 * The relationship detail (RFC-002 card E) in both places it is reached:
 * expanded in place from a Strategic position row, and as its own page.
 */

const SALES_REF = "#/boundedcontexts/sales_bc";
/** The hover text a role code carries, read from core rather than restated. */
const ACL_SUMMARY = PATTERNS["anti-corruption-layer"].summary;
const CATALOG_SALES_REF =
	"#/relationships/catalog_bc~customer-supplier~sales_bc";

test.beforeEach(async ({ page }) => {
	await servePetstore(page);
});

test("a Strategic position row expands in place into the relationship detail", async ({
	page,
}) => {
	await page.goto(viewerAt(SALES_REF));
	await expect(page.locator("main h1")).toContainText("Sales BC");

	const table = page.locator(".strategic-position");
	const toggle = table.getByRole("button", {
		name: "Evidence for Catalog BC and Sales BC",
	});
	await toggle.scrollIntoViewIfNeeded();
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await expect(page.locator("tr.detail")).toHaveCount(0);

	await toggle.click();

	await expect(toggle).toHaveAttribute("aria-expanded", "true");
	const detail = page.locator("tr.detail .relationship-detail");
	// The detail's own title; the blocks under it are h3s too, and each end
	// is a lockup, so the arrow between them sits in its own element.
	await expect(detail.locator("h3").first()).toHaveText(
		/Catalog BC\s+→\s+Sales BC/,
	);
	await expect(detail).toContainText(
		"Sales reads Catalog through PetSummaryClient",
	);
	// The row expands in place: the page never navigates away from Sales.
	await expect(page).toHaveURL(new RegExp(`${SALES_REF}$`));

	await toggle.click();
	await expect(page.locator("tr.detail")).toHaveCount(0);
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
	const row = await description.evaluate(
		(el) => el.closest("tr")?.getBoundingClientRect().height ?? 0,
	);
	expect(row).toBeLessThan(120);
});

test("a role code on the Strategic position table carries the pattern's meaning", async ({
	page,
}) => {
	await page.goto(viewerAt(SALES_REF));
	const table = page.locator(".strategic-position");
	// v2 sets a role code in the editor font with the pattern's summary as its
	// title, rather than v1's chip: what this relationship records is one click
	// away in the row's own detail, which the case above opens.
	const acl = table.locator(".keyword.mono", { hasText: "ACL" }).first();
	await acl.scrollIntoViewIfNeeded();
	await expect(acl).toHaveAttribute("title", ACL_SUMMARY);
});

test("a role code on the relationship page carries the pattern's meaning, and the evidence is on the page under it", async ({
	page,
}) => {
	await page.goto(viewerAt(CATALOG_SALES_REF));
	// The role is a mono keyword with the pattern's summary as its title, the
	// same treatment the strategic position table gives it. v1 disclosed the
	// pattern and this relationship's evidence together in a hover card; card
	// 38 rebuilds that on `HoverCard`, and until then the evidence is a
	// section of the page rather than a layer over the word.
	const acl = page.locator(".keyword.mono", { hasText: "ACL" }).first();
	await acl.scrollIntoViewIfNeeded();
	await expect(acl).toHaveAttribute("title", ACL_SUMMARY);
	await expect(page.locator("#comments")).toContainText(
		"Sales reads Catalog through PetSummaryClient",
	);
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
