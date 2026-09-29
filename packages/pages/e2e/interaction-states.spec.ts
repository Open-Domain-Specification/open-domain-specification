import { expect, type Locator, type Page, test } from "@playwright/test";
import {
	EXPORT_ORIGIN,
	servePetstore,
	viewerAt,
	WORKSPACE_NAME,
} from "./helpers";

/**
 * Focus, hover and the active tree item on the two surfaces that carry their
 * own theme (`assets/site.css`): the viewer and the static export. Inside VS
 * Code the editor supplies the colours; here a token the theme lacks draws
 * nothing, so these are checked with real keyboard and pointer input, in the
 * light and the dark scheme, against what the browser computed.
 */

const SALES_REF = "#/boundedcontexts/sales_bc";
/** Where the export is served; overridable so a run can pick its own port. */
const EXPORT = process.env.ODS_E2E_EXPORT_ORIGIN ?? EXPORT_ORIGIN;

const TRANSPARENT = /^(transparent|rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\))$/;

/** A focus ring the reader can see: a drawn outline or box shadow, not a transparent one. */
async function expectVisibleFocusRing(target: Locator) {
	await expect(target).toBeFocused();
	const ring = await target.evaluate((el) => {
		const s = getComputedStyle(el);
		return {
			outlineStyle: s.outlineStyle,
			outlineWidth: Number.parseFloat(s.outlineWidth),
			outlineColor: s.outlineColor,
			boxShadow: s.boxShadow,
			focusVisible: el.matches(":focus-visible"),
		};
	});
	expect(ring.focusVisible).toBe(true);
	const outline =
		ring.outlineStyle !== "none" &&
		ring.outlineWidth > 0 &&
		!TRANSPARENT.test(ring.outlineColor);
	const shadow = ring.boxShadow !== "none";
	expect(outline || shadow, JSON.stringify(ring)).toBe(true);
}

/** Tab from the top of the page until `target` has focus, as a keyboard reader would. */
async function tabTo(page: Page, target: Locator, limit = 120) {
	await page.evaluate(() => {
		window.scrollTo(0, 0);
		(document.activeElement as HTMLElement | null)?.blur();
	});
	for (let i = 0; i < limit; i++) {
		await page.keyboard.press("Tab");
		if (await target.evaluate((el) => el === document.activeElement)) return;
	}
	throw new Error(`Tab never reached the target within ${limit} presses`);
}

const background = (row: Locator) =>
	row.evaluate((el) => getComputedStyle(el).backgroundColor);

async function expectStates(page: Page) {
	const nav = page.locator("nav.tree");

	// Focus: a link in the tree, and a button in the table.
	const treeLink = nav.getByRole("link", { name: "Orders Team" });
	await tabTo(page, treeLink);
	await expectVisibleFocusRing(treeLink);

	const table = page.locator(".strategic-position");
	const toggle = table.getByRole("button", { name: /^Evidence for / }).first();
	await tabTo(page, toggle);
	await expectVisibleFocusRing(toggle);

	// Hover: a tree row and a table row take a wash they did not have.
	const treeRow = nav.locator(".item:not(.active)").first();
	await page.mouse.move(0, 0);
	const treeBefore = await background(treeRow);
	await treeRow.hover();
	const treeAfter = await background(treeRow);
	expect(treeAfter).not.toBe(treeBefore);
	expect(treeAfter).not.toMatch(TRANSPARENT);

	const tableRow = table.locator("tbody tr:not(.group, .detail)").first();
	await tableRow.scrollIntoViewIfNeeded();
	await page.mouse.move(0, 0);
	const rowBefore = await background(tableRow);
	await tableRow.hover();
	const rowAfter = await background(tableRow);
	expect(rowAfter).not.toBe(rowBefore);
	expect(rowAfter).not.toMatch(TRANSPARENT);

	// Active: the page being read is a filled row, and differs from a hover.
	const active = nav.locator(".item.active");
	await expect(active).toHaveCount(1);
	await page.mouse.move(0, 0);
	const filled = await background(active);
	expect(filled).not.toMatch(TRANSPARENT);
	expect(filled).not.toBe(treeAfter);

	// The theme names every interaction token the components read.
	const tokens = await page.evaluate(() => {
		const root = getComputedStyle(document.documentElement);
		return [
			"--vscode-focusBorder",
			"--vscode-list-hoverBackground",
			"--vscode-list-activeSelectionBackground",
			"--vscode-toolbar-hoverBackground",
			"--vscode-textLink-activeForeground",
		].filter((t) => root.getPropertyValue(t).trim() === "");
	});
	expect(tokens).toEqual([]);
}

for (const scheme of ["light", "dark"] as const) {
	test.describe(`the viewer, ${scheme}`, () => {
		test.use({ colorScheme: scheme });

		test("focus, hover and the active item are visible", async ({ page }) => {
			await servePetstore(page);
			await page.goto(viewerAt(SALES_REF));
			await expect(page.locator("main h1")).toContainText("Sales BC");
			await expectStates(page);
		});
	});

	test.describe(`the static export, ${scheme}`, () => {
		test.use({ baseURL: EXPORT, colorScheme: scheme });

		test("focus, hover and the active item are visible", async ({ page }) => {
			await page.goto("/");
			await page.getByRole("link", { name: WORKSPACE_NAME }).click();
			await page.evaluate((ref) => {
				location.hash = ref;
			}, SALES_REF);
			await expect(page.locator("main h1")).toContainText("Sales BC");
			await expectStates(page);
		});
	});
}
