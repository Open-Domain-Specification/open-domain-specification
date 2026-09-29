import { expect, type Locator, type Page, test } from "@playwright/test";
import {
	EXPORT_ORIGIN,
	openInteractiveDiagram,
	WORKSPACE_NAME,
} from "./helpers";

/**
 * A diagram is read with the keyboard as well as the pointer (epic 61, cards
 * 149 and 150). Every key here is a real key press; nothing calls a handler.
 * The same bundle runs in the webview, the viewer and the static export, so
 * the two hosts this suite can reach, the viewer and the export, run the same
 * claims.
 */

type Host = "viewer" | "export";

/** The diagram whose caption contains `title`, on the page at `ref`, in either host. */
async function openDiagram(
	page: Page,
	host: Host,
	title: string,
	ref: string,
): Promise<Locator> {
	if (host === "viewer") return openInteractiveDiagram(page, title, ref);
	await page.goto(`${EXPORT_ORIGIN}/${ref}`);
	await page.getByRole("link", { name: WORKSPACE_NAME }).click();
	const figure = page.locator("figure.diagram", { hasText: title });
	await figure.scrollIntoViewIfNeeded();
	return figure.locator(".svelte-flow");
}

/**
 * Puts the reader's place just before the diagram, the way arriving from the
 * text above it would, so that Tab is what carries them in.
 */
async function arriveAt(flow: Locator): Promise<void> {
	await flow.evaluate((el) => {
		const figure = el.closest("figure") as HTMLElement;
		figure.tabIndex = -1;
		figure.focus();
	});
}

/** Presses Tab until the focused element has `name`, or gives up after `limit` presses. */
async function tabTo(
	page: Page,
	name: string,
	limit = 40,
): Promise<number | undefined> {
	for (let presses = 1; presses <= limit; presses++) {
		await page.keyboard.press("Tab");
		const label = await page.evaluate(() =>
			document.activeElement?.getAttribute("aria-label"),
		);
		if (label === name) return presses;
	}
	return undefined;
}

for (const host of ["viewer", "export"] as const) {
	test.describe(`${host}: a diagram node is a control`, () => {
		test("every node is named for what it is and reached with Tab", async ({
			page,
		}) => {
			const flow = await openDiagram(page, host, "Context map", "");
			const nodes = flow.locator(".svelte-flow__node-context");
			await expect(nodes.first()).toBeVisible();
			const names = await nodes.evaluateAll((els) =>
				els.map((el) => el.getAttribute("aria-label")),
			);
			expect(names.length).toBeGreaterThan(1);
			for (const name of names) expect(name).toMatch(/^.+, .+$/);
			expect(names).toContain("Sales BC, bounded context");
			// The name is what assistive technology finds by role.
			await expect(
				flow.getByRole("link", { name: "Sales BC, bounded context" }),
			).toHaveCount(1);
			// Tab carries a reader onto each one in turn, in document order, and
			// the focus ring is drawn on it.
			await arriveAt(flow);
			const reached: string[] = [];
			for (let i = 0; i < 40 && reached.length < names.length; i++) {
				await page.keyboard.press("Tab");
				const label = await page.evaluate(() =>
					document.activeElement?.getAttribute("aria-label"),
				);
				if (label && names.includes(label)) reached.push(label);
			}
			expect(reached).toEqual(names);
			await expect(flow.locator(".svelte-flow__node:focus-visible")).toHaveCSS(
				"outline-style",
				"solid",
			);
			// The decorative cluster regions are not stops.
			await expect(
				flow.locator(".svelte-flow__node-cluster[tabindex]"),
			).toHaveCount(0);
		});

		test("Enter opens the page of the focused node", async ({ page }) => {
			const flow = await openDiagram(page, host, "Context map", "");
			await arriveAt(flow);
			expect(await tabTo(page, "Sales BC, bounded context")).toBeDefined();
			await page.keyboard.press("Enter");
			await expect(page).toHaveURL(/#\/boundedcontexts\/sales_bc$/);
			await expect(page.locator("main h1")).toContainText("Sales BC");
		});

		test("Space opens it too, and does not scroll the page", async ({
			page,
		}) => {
			const flow = await openDiagram(page, host, "Context map", "");
			await arriveAt(flow);
			expect(await tabTo(page, "Catalog BC, bounded context")).toBeDefined();
			// Space scrolls a page unless something takes it; the node must.
			await page.evaluate(() => {
				window.addEventListener("keydown", (e) => {
					(window as unknown as { spaceTaken: boolean }).spaceTaken =
						e.defaultPrevented;
				});
			});
			await page.keyboard.press(" ");
			await expect(page).toHaveURL(/#\/boundedcontexts\/catalog_bc$/);
			expect(
				await page.evaluate(
					() => (window as unknown as { spaceTaken: boolean }).spaceTaken,
				),
			).toBe(true);
		});

		test("the pointer still opens a node", async ({ page }) => {
			const flow = await openDiagram(page, host, "Context map", "");
			await flow
				.locator(".svelte-flow__node-context", { hasText: "Sales BC" })
				.click();
			await expect(page).toHaveURL(/#\/boundedcontexts\/sales_bc$/);
		});
	});
}
