import { expect, test } from "@playwright/test";
import { arriveAt, openDiagram, tabUntil } from "./diagram-hosts";

/**
 * The badges on a context map disclose a relationship's evidence (card 150).
 * A reader without a mouse has to be able to find one, hear that it holds
 * more, open it, and leave it with focus back where they were. Every key is a
 * real key press; the two hosts are the viewer and the static export.
 */

const SALES = "#/boundedcontexts/sales_bc";
/** The tolerated Sales to Inventory stereotype badge: the map's marked, evidence-bearing edge. */
const BADGE = ".port.stereotype.tolerated button";

for (const host of ["viewer", "export"] as const) {
	test.describe(`${host}: evidence opens and closes from the keyboard`, () => {
		test("a badge is a button that says it discloses more", async ({
			page,
		}) => {
			const flow = await openDiagram(page, host, "Sales BC context map", SALES);
			const badge = flow.locator(BADGE);
			await expect(badge).toHaveCount(1);
			await expect(badge).toHaveAttribute("aria-haspopup", "dialog");
			await expect(badge).toHaveAttribute("aria-expanded", "false");
			await expect(badge).not.toHaveAttribute("aria-controls", /.+/);
			// The name says what it does and what it is about, on one line.
			await expect(
				flow.getByRole("button", { name: /^Show evidence for .+/ }),
			).not.toHaveCount(0);
			const name = await badge.getAttribute("aria-label");
			expect(name).not.toContain("\n");
			// It opens with the text on the button, so speaking the label finds it.
			expect(name).toMatch(/^Show evidence for U\/D: /);
			// Hover still says what is known, as it always did.
			await expect(flow.locator(".port.stereotype.tolerated")).toHaveAttribute(
				"title",
				/projection|conform/i,
			);
		});

		for (const key of ["Enter", " "]) {
			test(`${key === " " ? "Space" : key} opens it, Escape closes it and focus comes back to the badge`, async ({
				page,
			}) => {
				const flow = await openDiagram(
					page,
					host,
					"Sales BC context map",
					SALES,
				);
				const badge = flow.locator(BADGE);
				await arriveAt(flow);
				expect(await tabUntil(page, BADGE)).toBe(true);
				await expect(badge).toBeFocused();
				await expect(badge).toHaveCSS("outline-style", "solid");

				await page.keyboard.press(key);
				const card = flow.getByRole("dialog");
				await expect(card).toBeVisible();
				await expect(badge).toHaveAttribute("aria-expanded", "true");
				// The button points at the card it opened.
				const id = await card.getAttribute("id");
				expect(id).toBeTruthy();
				await expect(badge).toHaveAttribute("aria-controls", id as string);
				// Focus moved into the card, so the next Tab is its contents.
				expect(
					await card.evaluate((el) => el.contains(document.activeElement)),
				).toBe(true);
				await expect(card.locator(".relationship-detail > h3")).toContainText(
					"Sales BC",
				);

				await page.keyboard.press("Escape");
				await expect(flow.getByRole("dialog")).toHaveCount(0);
				await expect(badge).toBeFocused();
				await expect(badge).toHaveAttribute("aria-expanded", "false");
			});
		}

		test("the card's own Close button, reached with Tab and pressed with Enter, returns focus to the badge", async ({
			page,
		}) => {
			const flow = await openDiagram(page, host, "Sales BC context map", SALES);
			const badge = flow.locator(BADGE);
			await arriveAt(flow);
			expect(await tabUntil(page, BADGE)).toBe(true);
			await page.keyboard.press("Enter");
			await expect(flow.getByRole("dialog")).toBeVisible();
			expect(await tabUntil(page, ".anchored button[aria-label='Close']")).toBe(
				true,
			);
			await page.keyboard.press("Enter");
			await expect(flow.getByRole("dialog")).toHaveCount(0);
			await expect(badge).toBeFocused();
		});

		test("in fullscreen Escape closes the card first and fullscreen second", async ({
			page,
		}) => {
			const flow = await openDiagram(page, host, "Sales BC context map", SALES);
			const badge = flow.locator(BADGE);
			const diagram = page.locator(".interactive.fullscreen");
			await flow.getByRole("button", { name: "Enter fullscreen" }).focus();
			await page.keyboard.press("Enter");
			await expect(diagram).toHaveCount(1);
			await arriveAt(flow);
			expect(await tabUntil(page, BADGE)).toBe(true);
			await page.keyboard.press("Enter");
			await expect(flow.getByRole("dialog")).toBeVisible();

			await page.keyboard.press("Escape");
			await expect(flow.getByRole("dialog")).toHaveCount(0);
			await expect(badge).toBeFocused();
			await expect(diagram).toHaveCount(1);

			await page.keyboard.press("Escape");
			await expect(diagram).toHaveCount(0);
		});

		test("the pointer still opens it, and a click elsewhere closes it without taking focus back", async ({
			page,
		}) => {
			const flow = await openDiagram(page, host, "Sales BC context map", SALES);
			const badge = flow.locator(BADGE);
			await badge.click();
			await expect(flow.getByRole("dialog")).toBeVisible();
			await expect(badge).toHaveAttribute("aria-expanded", "true");
			await flow
				.locator(".svelte-flow__pane")
				.click({ position: { x: 5, y: 5 } });
			await expect(flow.getByRole("dialog")).toHaveCount(0);
			await expect(badge).not.toBeFocused();
			await expect(badge).toHaveAttribute("aria-expanded", "false");
		});
	});
}
