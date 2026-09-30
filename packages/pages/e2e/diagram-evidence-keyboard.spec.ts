import { expect, test } from "@playwright/test";
import { arriveAt, openDiagram, tabUntil } from "./diagram-hosts";
import { measureCitation, onScreen, settle } from "./on-screen";

/**
 * The badges on a context map disclose a relationship's evidence (card 150).
 * A reader without a mouse has to be able to find one, hear that it holds
 * more, open it, and leave it with focus back where they were. Every key is a
 * real key press; the two hosts are the viewer and the static export.
 */

const SALES = "#/boundedcontexts/sales_bc";
/** The tolerated Sales to Inventory stereotype badge: the map's marked, evidence-bearing edge. */
const BADGE = ".port.stereotype.tolerated button";
/** The explanation's box: what a reader sees, and what `onScreen` measures. */
const LAYER = ".layer";

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

		for (const fullscreen of [false, true]) {
			test(`Escape closes the innermost layer first: pattern explanation, then the card${fullscreen ? ", then fullscreen" : ""}`, async ({
				page,
			}) => {
				await page.setViewportSize({ width: 1300, height: 900 });
				const flow = await openDiagram(
					page,
					host,
					"Sales BC context map",
					SALES,
				);
				const badge = flow.locator(BADGE);
				const overlay = page.locator(".interactive.fullscreen");
				if (fullscreen) {
					await flow.getByRole("button", { name: "Enter fullscreen" }).focus();
					await page.keyboard.press("Enter");
					await expect(overlay).toHaveCount(1);
				}
				await arriveAt(flow);
				expect(await tabUntil(page, BADGE)).toBe(true);
				await page.keyboard.press("Enter");
				const card = flow.getByRole("dialog");
				await expect(card).toBeVisible();

				// Tab to a pattern keyword inside the card: its explanation opens.
				const trigger = ".anchored .pattern-hover .trigger";
				expect(await tabUntil(page, trigger)).toBe(true);
				const explanation = card.getByRole("tooltip");
				await expect(explanation).toBeVisible();
				// Painted where the reader can see it, not only present in the DOM.
				await onScreen(page.locator(LAYER), "the explanation in the card");

				// First Escape: only the explanation goes. The card stays, and
				// focus stays on the keyword that opened it.
				await page.keyboard.press("Escape");
				await expect(explanation).toHaveCount(0);
				await expect(card).toBeVisible();
				await expect(page.locator(trigger).first()).toBeFocused();
				if (fullscreen) await expect(overlay).toHaveCount(1);

				// Second Escape: the card goes and focus returns to its badge.
				await page.keyboard.press("Escape");
				await expect(flow.getByRole("dialog")).toHaveCount(0);
				await expect(badge).toBeFocused();
				if (fullscreen) {
					await expect(overlay).toHaveCount(1);
					// Third Escape: only now does fullscreen end.
					await page.keyboard.press("Escape");
					await expect(overlay).toHaveCount(0);
				}
			});
		}

		test("a keyword focused by keyboard keeps its explanation through a late scroll report and a pointer crossing", async ({
			page,
		}) => {
			const flow = await openDiagram(page, host, "Sales BC context map", SALES);
			await arriveAt(flow);
			expect(await tabUntil(page, BADGE)).toBe(true);
			await page.keyboard.press("Enter");
			const card = flow.getByRole("dialog");
			await expect(card).toBeVisible();
			const trigger = ".anchored .pattern-hover .trigger";
			expect(await tabUntil(page, trigger)).toBe(true);
			const explanation = card.getByRole("tooltip");
			await expect(explanation).toBeVisible();
			await onScreen(page.locator(LAYER), "opened");

			/** Where the explanation sits relative to its keyword. */
			const offsetFromKeyword = () =>
				page.evaluate((selector) => {
					const word = document
						.querySelector(selector)
						?.getBoundingClientRect() as DOMRect;
					const tip = document
						.querySelector(".hover-card")
						?.getBoundingClientRect() as DOMRect;
					return { dy: tip.top - word.top, dx: tip.left - word.left };
				}, trigger);
			const placed = await offsetFromKeyword();

			// Focusing a keyword can scroll the diagram's container to reveal it, and
			// the browser does that after the explanation has opened (in the real
			// webview it did, about one run in seven, and the scroll closed it). Do
			// what the browser did: scroll the container under the open explanation.
			// Svelte Flow puts the container back at once, as it does for the
			// browser's own reveal, so what the page sees is the scroll events and a
			// keyword that may have moved and come back.
			const scrolled = await flow.evaluate((el) => {
				// A narrow window lets the card overflow the container; give it the
				// same room to scroll here, wherever the viewport is.
				const room = document.createElement("div");
				room.style.cssText =
					"position:absolute;left:0;top:0;width:4000px;height:1px;pointer-events:none";
				el.appendChild(room);
				const from = el.scrollLeft;
				el.scrollLeft = from + 40;
				return el.scrollLeft - from;
			});
			expect(scrolled).toBeGreaterThan(0);
			await page.evaluate(
				() => new Promise((done) => requestAnimationFrame(() => done(null))),
			);
			await expect(explanation).toBeVisible();
			await onScreen(page.locator(LAYER), "after the scroll report");
			// And it still sits where it did against the keyword.
			const after = await offsetFromKeyword();
			expect(Math.abs(after.dy - placed.dy)).toBeLessThan(1);
			expect(Math.abs(after.dx - placed.dx)).toBeLessThan(1);

			// A real pointer crossing the keyword and leaving, while keyboard focus
			// is on it, is not a reason to take the explanation away.
			const box = (await page.locator(trigger).first().boundingBox()) as {
				x: number;
				y: number;
				width: number;
				height: number;
			};
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
			await page.mouse.move(2, 2);
			await page.evaluate(() => new Promise((done) => setTimeout(done, 300)));
			await expect(explanation).toBeVisible();
			await expect(page.locator(trigger).first()).toBeFocused();
		});

		test("an explanation taller than the room stays inside the viewport and scrolls, however often a scroll places it again", async ({
			page,
		}) => {
			// A short window, so that what the keyword explains is taller than the
			// room above or below it.
			await page.setViewportSize({ width: 800, height: 110 });
			const flow = await openDiagram(page, host, "Sales BC context map", SALES);
			await arriveAt(flow);
			expect(await tabUntil(page, BADGE)).toBe(true);
			await page.keyboard.press("Enter");
			const card = flow.getByRole("dialog");
			await expect(card).toBeVisible();
			const trigger = ".anchored .pattern-hover .trigger";
			expect(await tabUntil(page, trigger)).toBe(true);
			await expect(card.getByRole("tooltip")).toBeVisible();

			/** The explanation's box against the viewport, and how far it can scroll. */
			const measure = () =>
				page.evaluate(() => {
					const layer = document.querySelector(".layer") as HTMLElement;
					const box = layer.getBoundingClientRect();
					return {
						top: box.top,
						bottom: box.bottom,
						height: box.height,
						viewport: document.documentElement.clientHeight,
						scrollHeight: layer.scrollHeight,
						clientHeight: layer.clientHeight,
						cap: layer.style.maxHeight,
					};
				});
			const contained = async (when: string) => {
				await onScreen(page.locator(LAYER), when);
				const m = await measure();
				expect(m.top, `${when}: top`).toBeGreaterThanOrEqual(0);
				expect(m.bottom, `${when}: bottom`).toBeLessThanOrEqual(m.viewport);
				expect(m.cap, `${when}: capped`).not.toBe("");
				// Taller than the room, so it scrolls inside itself.
				expect(m.scrollHeight, `${when}: content`).toBeGreaterThan(
					m.clientHeight,
				);
				return m;
			};
			const first = await contained("opened");

			// Scrolls of the diagram's container, as the browser's own reveal of the
			// focused keyword makes, each placing the explanation again. The first is
			// a real scroll; each after it is one more report of a scroll, one
			// placement apiece, so that a placement that undoes the last one shows
			// on the very next check.
			await flow.evaluate((el) => {
				const room = document.createElement("div");
				room.style.cssText =
					"position:absolute;left:0;top:0;width:4000px;height:1px;pointer-events:none";
				el.appendChild(room);
			});
			const frames = () =>
				page.evaluate(
					() =>
						new Promise((done) =>
							requestAnimationFrame(() =>
								requestAnimationFrame(() => done(null)),
							),
						),
				);
			for (let i = 1; i <= 5; i += 1) {
				if (i === 1) {
					const scrolled = await flow.evaluate((el) => {
						el.scrollLeft += 40;
						return el.scrollLeft;
					});
					expect(scrolled).toBeGreaterThan(0);
				} else {
					await flow.evaluate((el) => {
						el.dispatchEvent(new Event("scroll"));
					});
				}
				await frames();
				await expect(card.getByRole("tooltip")).toBeVisible();
				const again = await contained(`after scroll ${i}`);
				expect(again.height, `after scroll ${i}: same height`).toBeCloseTo(
					first.height,
					0,
				);
				expect(again.cap, `after scroll ${i}: same cap`).toBe(first.cap);
			}

			// And it scrolls: the last of its content can be brought into view, and
			// is still there once scrolling and layout have settled (a read in the
			// same callback comes before the scroll event and whatever it does).
			await page.evaluate(() => {
				const layer = document.querySelector(".layer") as HTMLElement;
				layer.scrollTop = layer.scrollHeight;
			});
			await settle(page);
			const scrolled = await page.evaluate(
				() => (document.querySelector(".layer") as HTMLElement).scrollTop,
			);
			expect(scrolled).toBeGreaterThan(0);
		});

		for (const height of [110, 300]) {
			test(`Tab into a citation in an explanation that scrolls keeps it in view at 800x${height}, and a keyword that moves keeps the reader's place in it`, async ({
				page,
			}) => {
				await page.setViewportSize({ width: 800, height });
				const flow = await openDiagram(
					page,
					host,
					"Sales BC context map",
					SALES,
				);
				await arriveAt(flow);
				expect(await tabUntil(page, BADGE)).toBe(true);
				await page.keyboard.press("Enter");
				await expect(flow.getByRole("dialog")).toBeVisible();
				expect(await tabUntil(page, ".anchored .pattern-hover .trigger")).toBe(
					true,
				);
				const layer = page.locator(LAYER);
				await expect(layer).toBeVisible();

				// Tab from the keyword into the citation at the foot of its explanation.
				await page.keyboard.press("Tab");
				await expect(page.locator(`${LAYER} a`).first()).toBeFocused();
				await settle(page);
				const seen = await measureCitation(page);
				const said = JSON.stringify(seen);
				expect(seen.focused, `focus is in the explanation ${said}`).toBe(true);
				expect(seen.maxScroll, `it scrolls ${said}`).toBeGreaterThan(0);
				expect(
					seen.scrollTop,
					`it scrolled to the citation ${said}`,
				).toBeGreaterThan(0);
				expect(
					seen.inside,
					`the citation is inside the explanation ${said}`,
				).toBe(true);
				expect(seen.hitIsCitation, `and is what is painted there ${said}`).toBe(
					true,
				);
				await onScreen(layer, "the explanation");

				// The keyword moves under it (a scroll of the container that holds
				// it): the explanation is placed again, and the reader keeps their
				// place in it.
				await flow.evaluate((el) => {
					const room = document.createElement("div");
					room.style.cssText =
						"position:absolute;left:0;top:0;width:4000px;height:1px;pointer-events:none";
					el.appendChild(room);
					el.scrollLeft += 40;
				});
				await settle(page);
				const moved = await measureCitation(page);
				const movedSaid = JSON.stringify(moved);
				expect(moved.focused, `still focused ${movedSaid}`).toBe(true);
				expect(
					Math.abs(moved.scrollTop - seen.scrollTop),
					`scroll kept ${movedSaid} from ${said}`,
				).toBeLessThan(1);
				expect(moved.inside, `still inside ${movedSaid}`).toBe(true);
				expect(moved.hitIsCitation, `still painted ${movedSaid}`).toBe(true);
			});
		}

		test("the pointer opens a keyword's explanation inside the card, painted on screen, and can cross into it", async ({
			page,
		}) => {
			await page.setViewportSize({ width: 1300, height: 900 });
			const flow = await openDiagram(page, host, "Sales BC context map", SALES);
			await flow.locator(BADGE).click();
			const card = flow.getByRole("dialog");
			await expect(card).toBeVisible();
			const trigger = page.locator(".anchored .pattern-hover .trigger").first();
			await trigger.hover();
			const explanation = card.getByRole("tooltip");
			await expect(explanation).toBeVisible();
			await onScreen(page.locator(LAYER), "hovered by the pointer");

			// Down into the explanation itself, as a reader does to reach a link in
			// it: the pointer leaves the keyword and the explanation stays.
			const box = (await page.locator(LAYER).boundingBox()) as {
				x: number;
				y: number;
				width: number;
				height: number;
			};
			await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2, {
				steps: 5,
			});
			await page.evaluate(() => new Promise((done) => setTimeout(done, 300)));
			await expect(explanation).toBeVisible();

			// Off both, it goes.
			await page.mouse.move(2, 2);
			await expect(explanation).toHaveCount(0);
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
