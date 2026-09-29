import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import AxeBuilder from "@axe-core/playwright";
import { Workspace } from "@open-domain-specification/core";
import { expect, type Page, test } from "@playwright/test";
import { exportSite } from "../dist/site.js";
import { PETSTORE_SCHEMA, servePetstore, viewerAt } from "./helpers";

/**
 * The reader can tell where they are. The tree marks the page being read with
 * `aria-current="page"` on its link and nothing else carries `aria-current`;
 * its ancestors are highlighted by the row wash only, which is a separate fact
 * from which page is current. The tree, the page and the contents are three landmarks, and the two
 * navigations are told apart by name.
 */

type Host = { name: string; open: (page: Page) => Promise<void> };

let exportDir: string;
test.beforeAll(async () => {
	exportDir = await mkdtemp(join(tmpdir(), "ods-current-"));
	await exportSite({
		appDir: join(__dirname, "../app"),
		sources: [
			{
				workspace: Workspace.fromSchema(PETSTORE_SCHEMA),
				fileLabel: "petstore.json",
				diagnostics: [],
			},
		],
		outDir: exportDir,
	});
});
test.afterAll(async () => {
	await rm(exportDir, { recursive: true, force: true });
});

const hosts: Host[] = [
	{
		name: "the viewer",
		open: async (page) => {
			await servePetstore(page);
			await page.goto(viewerAt());
		},
	},
	{
		name: "the static export",
		open: async (page) => {
			await page.goto(pathToFileURL(join(exportDir, "index.html")).href);
		},
	},
];

/** The hrefs of every tree link that carries `aria-current`, keyed by its value. */
const marked = (page: Page) =>
	page.evaluate(() => {
		const out: Record<string, string[]> = {};
		for (const a of document.querySelectorAll("nav.tree a[aria-current]")) {
			const value = a.getAttribute("aria-current") as string;
			out[value] = [...(out[value] ?? []), a.getAttribute("href") as string];
		}
		return out;
	});

/** The hrefs of the tree links whose row is drawn as active. */
const drawnActive = (page: Page) =>
	page
		.locator("nav.tree .item.active a")
		.evaluateAll((els) => els.map((a) => a.getAttribute("href") as string));

const PET = "#/boundedcontexts/catalog_bc/aggregates/pet";
const CATALOG = "#/boundedcontexts/catalog_bc";

for (const host of hosts) {
	test.describe(host.name, () => {
		test.beforeEach(async ({ page }) => {
			await host.open(page);
			await expect(page.locator("main h1")).toBeVisible();
		});

		test("the tree, the page and the contents are landmarks; the two navigations are named apart", async ({
			page,
		}) => {
			await expect(
				page.getByRole("navigation", { name: "Workspace elements" }),
			).toHaveCount(1);
			await expect(
				page.getByRole("navigation", { name: "On this page" }),
			).toHaveCount(1);
			await expect(page.getByRole("main")).toHaveCount(1);
			const names = await page
				.getByRole("navigation")
				.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
			expect(names).toHaveLength(2);
			expect(new Set(names).size).toBe(2);
			expect(names.every(Boolean)).toBe(true);
		});

		test("every navigation landmark has a distinct, non-empty name, and axe finds no duplicate landmark", async ({
			page,
		}) => {
			await page.evaluate((ref) => {
				location.hash = ref;
			}, CATALOG);
			await expect(page.locator("main h1")).toHaveText(/^\s*Catalog\b/);
			const names = await page
				.getByRole("navigation")
				.evaluateAll((els) =>
					els.map((el) => el.getAttribute("aria-label") ?? ""),
				);
			expect(names.sort()).toEqual([
				"Breadcrumb",
				"On this page",
				"Workspace elements",
			]);
			const result = await new AxeBuilder({ page })
				.withRules(["landmark-unique"])
				.analyze();
			expect(result.violations.map((v) => v.id)).toEqual([]);
		});

		test("the page being read is marked current in the tree, and the mark follows every navigation", async ({
			page,
		}) => {
			// A page with no row in the tree marks nothing.
			expect(await marked(page)).toEqual({});

			const link = page.locator(`nav.tree a[href="${PET}"]`);
			await link.focus();
			await page.keyboard.press("Enter");
			await expect(page.locator("main h1")).toHaveText(/^\s*Pet\b/);
			expect(await marked(page)).toEqual({ page: [PET] });

			// The wash still marks the page's row and its ancestor; that is
			// drawn state, asserted apart from the one current link.
			expect((await drawnActive(page)).sort()).toEqual([CATALOG, PET].sort());

			// Another page: the mark moves, it does not accumulate.
			const context = page.locator(`nav.tree a[href="${CATALOG}"]`);
			await context.focus();
			await page.keyboard.press("Enter");
			await expect(page.locator("main h1")).toHaveText(/^\s*Catalog\b/);
			expect(await marked(page)).toEqual({ page: [CATALOG] });
			expect(await drawnActive(page)).toEqual([CATALOG]);

			// History: back restores the mark with the page.
			await page.goBack();
			await expect(page.locator("main h1")).toHaveText(/^\s*Pet\b/);
			expect(await marked(page)).toEqual({ page: [PET] });
			expect((await drawnActive(page)).sort()).toEqual([CATALOG, PET].sort());
			await page.goForward();
			await expect(page.locator("main h1")).toHaveText(/^\s*Catalog\b/);
			expect(await marked(page)).toEqual({ page: [CATALOG] });
		});

		test("a contents entry scrolls within the page and leaves the current mark where it is", async ({
			page,
		}) => {
			await page.locator(`nav.tree a[href="${CATALOG}"]`).click();
			await expect(page.locator("main h1")).toHaveText(/^\s*Catalog\b/);
			const before = await marked(page);
			await page.locator("nav.toc a").last().click();
			expect(await marked(page)).toEqual(before);
			expect(before).toEqual({ page: [CATALOG] });
		});
	});
}

test("the embedded bundle has the page and its contents as landmarks and no tree (browser, not VS Code)", async ({
	page,
}) => {
	await page.addInitScript(() => {
		(window as unknown as { acquireVsCodeApi: unknown }).acquireVsCodeApi =
			() => ({ postMessage: () => undefined });
	});
	await page.goto("/");
	await page.evaluate((schema) => {
		window.postMessage(
			{ type: "model", workspaces: [{ schema, fileLabel: "p.json" }] },
			"*",
		);
	}, PETSTORE_SCHEMA);
	await expect(page.getByRole("main")).toHaveCount(1);
	await expect(page.getByRole("navigation")).toHaveCount(1);
	await expect(
		page.getByRole("navigation", { name: "On this page" }),
	).toBeVisible();
});
