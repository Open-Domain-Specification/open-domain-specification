import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { Workspace } from "@open-domain-specification/core";
import { expect, type Page, test } from "@playwright/test";
import { exportSite } from "../dist/site.js";
import { PETSTORE_SCHEMA, servePetstore, viewerAt } from "./helpers";

/**
 * Navigation moves focus. Following a link to another page lands focus on that
 * page's heading, a table-of-contents entry lands it on its section's heading,
 * and history navigation lands it on the heading of the page it restores. The
 * heading is a programmatic focus target (`tabindex="-1"`) and never a tab
 * stop, so the next Tab is the next thing a reader can act on in the page.
 *
 * All input here is real keys and real history: `Enter` on a focused link,
 * `Tab`, `page.goBack()` and `page.goForward()`.
 */

type Host = { name: string; open: (page: Page) => Promise<void> };

let exportDir: string;
test.beforeAll(async () => {
	exportDir = await mkdtemp(join(tmpdir(), "ods-focus-"));
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

const active = (page: Page) =>
	page.evaluate(() => {
		const el = document.activeElement as HTMLElement | null;
		return {
			tag: el?.tagName ?? null,
			text: el?.textContent?.trim().slice(0, 80) ?? "",
			inMain: !!el?.closest("main"),
			isH1: el?.matches("main h1") ?? false,
			tabindex: el?.getAttribute("tabindex") ?? null,
		};
	});

const h1Text = (page: Page) => page.locator("main h1").innerText();

for (const host of hosts) {
	test.describe(host.name, () => {
		test.beforeEach(async ({ page }) => {
			await host.open(page);
			await expect(page.locator("main h1")).toBeVisible();
		});

		test("the initial load does not take focus", async ({ page }) => {
			expect((await active(page)).tag).toBe("BODY");
		});

		test("Enter on a page link moves focus to the new page's heading, and Tab goes on into the page", async ({
			page,
		}) => {
			const before = await h1Text(page);
			const link = page.locator('main a[href^="#/boundedcontexts/"]').first();
			const href = await link.getAttribute("href");
			await link.focus();
			await page.keyboard.press("Enter");

			await expect(page.locator("main h1")).not.toHaveText(before);
			const now = await active(page);
			expect(now.isH1).toBe(true);
			expect(now.tabindex).toBe("-1");
			expect(decodeURIComponent(await page.evaluate(() => location.hash))).toBe(
				decodeURIComponent(href as string),
			);

			// The heading is a target, not a stop: Tab leaves it for the next
			// control in the page, not for the sidebar or the top of the document.
			await page.keyboard.press("Tab");
			const next = await active(page);
			expect(next.isH1).toBe(false);
			expect(next.inMain).toBe(true);
		});

		test("Enter on a sidebar tree link moves focus to the new page's heading", async ({
			page,
		}) => {
			const before = await h1Text(page);
			const link = page.locator('nav.tree a[href*="/aggregates/"]').first();
			await link.focus();
			await page.keyboard.press("Enter");

			await expect(page.locator("main h1")).not.toHaveText(before);
			expect((await active(page)).isH1).toBe(true);
		});

		test("Enter on a table-of-contents entry moves focus to its section heading, below the toolbar", async ({
			page,
		}) => {
			const entries = page.locator(".toc a");
			const last = entries.nth((await entries.count()) - 1);
			const id = ((await last.getAttribute("href")) as string).slice(1);
			await last.focus();
			await page.keyboard.press("Enter");

			const heading = page.locator(`section#${id} > .heading`).first();
			await expect(heading).toBeFocused();
			expect(await heading.getAttribute("tabindex")).toBe("-1");
			// The smooth scroll settles with the heading under the sticky
			// toolbar's 32px, at the scroll margin the heading declares.
			await expect
				.poll(async () =>
					heading.evaluate((el) => Math.round(el.getBoundingClientRect().top)),
				)
				.toBeGreaterThanOrEqual(32);

			await page.keyboard.press("Tab");
			const next = await active(page);
			expect(next.inMain).toBe(true);
			expect(next.tabindex).not.toBe("-1");
		});

		test("back and forward restore the page and put focus on its heading", async ({
			page,
		}) => {
			const first = await h1Text(page);
			const link = page.locator('main a[href^="#/boundedcontexts/"]').first();
			await link.focus();
			await page.keyboard.press("Enter");
			await expect(page.locator("main h1")).not.toHaveText(first);
			const second = await h1Text(page);

			// Move focus away from the heading so the assertion is about history.
			await page.keyboard.press("Tab");
			expect((await active(page)).isH1).toBe(false);

			await page.goBack();
			await expect(page.locator("main h1")).toHaveText(first);
			expect((await active(page)).isH1).toBe(true);

			await page.goForward();
			await expect(page.locator("main h1")).toHaveText(second);
			expect((await active(page)).isH1).toBe(true);
		});
	});
}

test("a host that navigates the page for the reader does not take focus (browser, not VS Code)", async ({
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
	await expect(page.locator("main h1")).toBeVisible();
	const before = await h1Text(page);

	await page.evaluate(() => {
		window.postMessage(
			{ type: "navigate", ref: "#/boundedcontexts/catalog_bc" },
			"*",
		);
	});

	await expect(page.locator("main h1")).not.toHaveText(before);
	expect((await active(page)).tag).toBe("BODY");
});
