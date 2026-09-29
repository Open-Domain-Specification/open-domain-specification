import { expect, test } from "@playwright/test";
import { serveModel } from "./helpers";

/**
 * A pair of contexts that holds two agreements says, on each exchange, which
 * one it runs under (issue #55). RiverMart's warehouse reaches Vendor
 * Purchasing (Legacy) under a negotiated lookup and a tolerated nightly feed.
 */
const WAREHOUSE_API = "#/boundedcontexts/warehouse/services/warehouse_api";

test("the consumes table names the agreement each exchange runs under", async ({
	page,
}) => {
	const url = await serveModel(page, "rivermart");
	await page.goto(`/?url=${encodeURIComponent(url)}${WAREHOUSE_API}`);
	await expect(page.locator("main h1")).toContainText("WarehouseAPI");

	const table = page
		.locator("table", {
			has: page.getByRole("columnheader", { name: "Agreement" }),
		})
		.first();
	await expect(
		table.getByRole("columnheader").allTextContents(),
	).resolves.toEqual([
		"Consumable",
		"Provider",
		"Context",
		"Agreement",
		"Made By",
		"Protection",
	]);
	const row = (consumable: string) =>
		table.locator("tbody tr", {
			has: page.getByRole("link", { name: consumable, exact: true }),
		});

	const lookup = row("GetPurchaseOrder").getByRole("link", {
		name: "purchase order lookup",
	});
	await expect(lookup).toHaveAttribute(
		"href",
		/#\/relationships\/.*purchase_order_lookup$/,
	);
	const feed = row("PurchaseOrderReceived").getByRole("link", {
		name: "legacy stock feed",
	});
	await expect(feed).toHaveAttribute(
		"href",
		/#\/relationships\/.*legacy_stock_feed$/,
	);
	// A row that names none has nothing in the cell.
	await expect(row("ReceiveStock").locator("td:nth-child(4)")).toHaveText("");

	// The link lands on the agreement's own page.
	await lookup.click();
	await expect(page).toHaveURL(/#\/relationships\/.*purchase_order_lookup$/);
	await expect(page.locator("main h1")).toContainText("Vendor Purchasing");
});
