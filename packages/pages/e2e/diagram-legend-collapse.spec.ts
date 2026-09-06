import { expect, test } from "@playwright/test";
import { serveModel } from "./helpers";

/**
 * The legend gives way when the fit runs out of room (card 64). NorthBank's
 * fifteen contexts in an editor tab at 1150x700 are the case that forced the
 * zoom floor down to 0.1: with the legend's column reserved the map only fit
 * as a smudge. Now the legend collapses to its header row instead, and the
 * reader opens it when they want the terms.
 */
test("NorthBank's legend gives way at editor size and opens on demand", async ({
	page,
}) => {
	await page.setViewportSize({ width: 1150, height: 700 });
	const url = await serveModel(page, "northbank");
	await page.goto(`/?url=${encodeURIComponent(url)}`);
	const figure = page.locator("figure.diagram", { hasText: "Context map" });
	await figure.scrollIntoViewIfNeeded();
	const flow = figure.locator(".svelte-flow");
	await expect(flow.locator(".svelte-flow__node").first()).toBeVisible();
	const legend = flow.locator(".diagram-legend");
	const header = legend.getByRole("button", { name: "Legend" });

	// The fit lands a couple of frames after the nodes are measured.
	await expect(header).toHaveAttribute("aria-expanded", "false");
	await expect(legend.locator("dl")).toBeHidden();
	// Collapsed, the panel is one row: the header and nothing under it.
	const row = await header.evaluate((el) => el.getBoundingClientRect().height);
	expect(
		await legend.evaluate((el) => el.getBoundingClientRect().height),
	).toBeLessThan(row * 2);

	await header.click();
	await expect(header).toHaveAttribute("aria-expanded", "true");
	await expect(legend.locator("dl")).toBeVisible();
	await expect(legend.locator("dt").first()).toBeVisible();
});

test("the reader opens the legend from the keyboard", async ({ page }) => {
	await page.setViewportSize({ width: 1150, height: 700 });
	const url = await serveModel(page, "northbank");
	await page.goto(`/?url=${encodeURIComponent(url)}`);
	const figure = page.locator("figure.diagram", { hasText: "Context map" });
	await figure.scrollIntoViewIfNeeded();
	const flow = figure.locator(".svelte-flow");
	const header = flow
		.locator(".diagram-legend")
		.getByRole("button", { name: "Legend" });
	await expect(header).toHaveAttribute("aria-expanded", "false");
	await header.focus();
	await expect(header).toBeFocused();
	await page.keyboard.press("Enter");
	await expect(header).toHaveAttribute("aria-expanded", "true");
});
