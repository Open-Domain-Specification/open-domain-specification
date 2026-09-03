import { expect, test } from "@playwright/test";
import { servePetstore, viewerAt } from "./helpers";

/**
 * The relationship detail (RFC-002 card E) in both places it is reached:
 * expanded in place from a Strategic position row, and as its own page.
 */

const SALES_REF = "#/boundedcontexts/sales_bc";
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

	const table = page.locator("table.strategic-position");
	const toggle = table.getByRole("button", {
		name: "Evidence for Catalog BC and Sales BC",
	});
	await toggle.scrollIntoViewIfNeeded();
	await expect(toggle).toHaveAttribute("aria-expanded", "false");
	await expect(page.locator(".detail-row")).toHaveCount(0);

	await toggle.click();

	await expect(toggle).toHaveAttribute("aria-expanded", "true");
	const detail = page.locator(".detail-row .relationship-detail");
	await expect(detail.locator("h3")).toHaveText(/Catalog BC → Sales BC/);
	await expect(detail).toContainText(
		"Sales reads Catalog through PetSummaryClient",
	);
	// The row expands in place: the page never navigates away from Sales.
	await expect(page).toHaveURL(new RegExp(`${SALES_REF}$`));

	await toggle.click();
	await expect(page.locator(".detail-row")).toHaveCount(0);
});

test("a relationship ref opens the relationship as its own page", async ({
	page,
}) => {
	await page.goto(viewerAt(CATALOG_SALES_REF));

	await expect(page.locator("main .crumbs .kind")).toHaveText("Relationship");
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
