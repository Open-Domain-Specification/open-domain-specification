import { expect, test } from "@playwright/test";
import { arriveAt, openDiagram, tabTo } from "./diagram-hosts";

/**
 * A diagram is read with the keyboard as well as the pointer (epic 61, cards
 * 149 and 150). Every key here is a real key press; nothing calls a handler.
 * The same bundle runs in the webview, the viewer and the static export, so
 * the two hosts this suite can reach, the viewer and the export, run the same
 * claims.
 */

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

		test("Tab stops only on things that do something: no edge announces an action it does not have", async ({
			page,
		}) => {
			const flow = await openDiagram(page, host, "Context map", "");
			await arriveAt(flow);
			const stops: { label: string | null; said: string }[] = [];
			for (let i = 0; i < 40; i++) {
				await page.keyboard.press("Tab");
				const stop = await page.evaluate(() => {
					const el = document.activeElement as HTMLElement;
					const id = el.getAttribute("aria-describedby");
					return {
						inside: !!el.closest(".svelte-flow"),
						label: el.getAttribute("aria-label"),
						said: id ? (document.getElementById(id)?.textContent ?? "") : "",
					};
				});
				if (!stop.inside) break;
				stops.push(stop);
			}
			expect(stops.length).toBeGreaterThan(5);
			// Nothing here is an edge stop, and nothing says "select" or "delete".
			expect(stops.filter((s) => /^Edge from/.test(s.label ?? ""))).toEqual([]);
			expect(stops.filter((s) => /select|delete|move/i.test(s.said))).toEqual(
				[],
			);
			// What is left is badges, then nodes, then the controls.
			const kinds = stops.map((s) =>
				/^Show evidence/.test(s.label ?? "")
					? "badge"
					: /, /.test(s.label ?? "")
						? "node"
						: "control",
			);
			expect(kinds.indexOf("node")).toBeGreaterThan(kinds.lastIndexOf("badge"));
			expect(kinds.lastIndexOf("node")).toBeLessThan(kinds.indexOf("control"));
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
