import { readFileSync } from "node:fs";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Workspace } from "@open-domain-specification/core";
import { expect, type Locator, type Page, test } from "@playwright/test";
import { exportSite } from "../dist/site.js";
import { expectNoSidewaysScroll, modelHash, serveModel } from "./helpers";

/**
 * Issue #85. At 1300x900 beside the tree the crossings table sits under the
 * 900px tier, where a cell wraps between tokens, and a consumable's link drew
 * its icon on one line and "CustomerVerified" on the next. A link with an icon
 * is a lockup and never breaks inside itself. Measured in rendered line boxes,
 * not text: every fragment of the link sits on one line, and the icon's
 * middle is within the name's line. Narrower, the lockup stays whole and the
 * page never scrolls sideways; the table's own frame may.
 */
const NB_KYC_ACCOUNTS =
	"#/relationships/customer_&_kyc/upstream-downstream/accounts";
/** The width the defect was found at: a desktop window with the site tree open. */
const BESIDE_THE_TREE = { width: 1300, height: 900 };

let exportDir: string;

test.beforeAll(async () => {
	const schema = JSON.parse(
		readFileSync(
			join(__dirname, "../../../models/northbank/.ods/northbank.json"),
			"utf8",
		),
	);
	const workspace = Workspace.fromSchema(schema);
	exportDir = await mkdtemp(join(tmpdir(), "ods-lockup-"));
	await exportSite({
		appDir: join(__dirname, "../app"),
		sources: [{ workspace, fileLabel: "northbank.json", diagnostics: [] }],
		outDir: exportDir,
	});
});

test.afterAll(async () => {
	await rm(exportDir, { recursive: true, force: true });
});

const hosts: [string, (page: Page) => Promise<void>][] = [
	[
		"viewer",
		async (page) => {
			const url = await serveModel(page, "northbank");
			await page.goto(
				`/?url=${encodeURIComponent(url)}${modelHash(NB_KYC_ACCOUNTS)}`,
			);
		},
	],
	[
		"export",
		async (page) => {
			await page.goto(
				`${pathToFileURL(join(exportDir, "index.html")).href}${modelHash(NB_KYC_ACCOUNTS)}`,
			);
		},
	],
];

async function expectLockupWhole(link: Locator) {
	const { lines, icon, name } = await link.evaluate((a) => {
		const range = document.createRange();
		range.selectNodeContents(a);
		const rects = [...range.getClientRects()]
			.filter((r) => r.width > 0)
			.sort((x, y) => x.top - y.top);
		let bottom = Number.NEGATIVE_INFINITY;
		let lines = 0;
		for (const r of rects) {
			if (r.top >= bottom) lines += 1;
			bottom = Math.max(bottom, r.bottom);
		}
		const glyph = a.querySelector(".codicon")?.getBoundingClientRect();
		const text = document.createRange();
		const walker = document.createTreeWalker(a, NodeFilter.SHOW_TEXT);
		const node = walker.nextNode();
		if (node) text.selectNodeContents(node);
		const box = text.getBoundingClientRect();
		return {
			lines,
			icon: glyph && {
				top: glyph.top,
				bottom: glyph.bottom,
				right: glyph.right,
			},
			name: { top: box.top, bottom: box.bottom, left: box.left },
		};
	});
	expect(lines).toBe(1);
	expect(icon).toBeDefined();
	const middle = ((icon?.top ?? 0) + (icon?.bottom ?? 0)) / 2;
	expect(middle).toBeGreaterThan(name.top);
	expect(middle).toBeLessThan(name.bottom);
	// Side by side: the name starts after the icon, on its line.
	expect(name.left).toBeGreaterThanOrEqual(icon?.right ?? 0);
}

for (const [origin, open] of hosts) {
	test(`${origin}: a consumable's icon stays with its name in the crossings table beside the tree, and narrower (#85)`, async ({
		page,
	}) => {
		await page.setViewportSize(BESIDE_THE_TREE);
		await open(page);
		await expect(page.locator("main h1")).toContainText("Accounts");
		await expect(
			page.getByRole("navigation", { name: "Workspace elements" }),
		).toBeVisible();
		const link = page
			.locator("#crossings tbody tr td:first-child a")
			.filter({ hasText: "CustomerVerified" });
		await link.scrollIntoViewIfNeeded();
		// The tier the defect lived in: the table's frame is at most 900px wide.
		const frame = await page
			.locator("#crossings .frame")
			.evaluate((el) => el.clientWidth);
		expect(frame).toBeLessThanOrEqual(900);
		await expectLockupWhole(link);

		for (const width of [1100, 800, 390]) {
			await page.setViewportSize({ width, height: 900 });
			await link.scrollIntoViewIfNeeded();
			await expectLockupWhole(link);
			await expectNoSidewaysScroll(page);
		}
	});
}
