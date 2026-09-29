import { expect, type Locator, test } from "@playwright/test";
import { serveModel } from "./helpers";

/**
 * Issue #43: where a relationship has no description, the strategic position
 * table shows the sentence the model generates, and says so. RiverMart's Order
 * Management has both kinds of row, so one table shows the difference.
 */
const GENERATED_TITLE =
	"Generated from the relationship's type and roles. The model has no authored description.";

test("a generated description is marked as generated and an authored one is not", async ({
	page,
}) => {
	const url = await serveModel(page, "rivermart");
	await page.goto(
		`/?url=${encodeURIComponent(url)}#/boundedcontexts/order_management`,
	);
	await expect(page.locator("main h1")).toContainText("Order Management");

	const cells = page.locator(".strategic-position span.description");
	const generated = page.locator(
		".strategic-position span.description.generated",
	);
	const authored = page.locator(
		".strategic-position span.description:not(.generated)",
	);
	// Order Management has three generated rows and six authored ones.
	await expect(generated).toHaveCount(3);
	await expect(authored).toHaveCount(6);
	await expect(cells).toHaveCount(9);

	for (const cell of await generated.all()) {
		const keyword = cell.locator(".keyword");
		await expect(keyword).toHaveText("generated");
		await expect(keyword).toHaveAttribute("title", GENERATED_TITLE);
		// The sentence is there as well, ahead of the marker.
		const text = (await cell.textContent()) ?? "";
		expect(text.replace("generated", "").trim().length).toBeGreaterThan(20);
	}
	// The generated sentence is set apart in the secondary colour.
	const colourOf = (cell: Locator) =>
		cell.evaluate((el) => getComputedStyle(el).color);
	expect(await colourOf(generated.first())).not.toBe(
		await colourOf(authored.first()),
	);
	for (const cell of await authored.all()) {
		await expect(cell.locator(".keyword")).toHaveCount(0);
		await expect(cell).not.toContainText("generated");
	}
});
