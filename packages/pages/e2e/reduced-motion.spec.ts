import { expect, type Locator, type Page, test } from "@playwright/test";
import { openDiagram, openPage } from "./diagram-hosts";
import { ORDER_REF } from "./helpers";

const ATTRIBUTE_REF = `${ORDER_REF}/entities/order/attributes/status`;

/**
 * A reader who has asked their system for less motion gets none in the pages
 * (card 151): no CSS animation or transition, no programmatic scroll or
 * viewport animation. Each claim is paired with the same page under
 * `no-preference`, so a check that could not fail cannot pass: the motion is
 * there to be switched off. The same bundle runs in the webview, the viewer and
 * the static export; this runs the first two hosts it can reach.
 */

/**
 * Records every `scrollIntoView` the page makes and how it asked to scroll,
 * before any page script runs.
 */
async function spyOnScrolling(page: Page): Promise<void> {
	await page.addInitScript(() => {
		const scrolls: unknown[] = [];
		(window as unknown as { scrolls: unknown[] }).scrolls = scrolls;
		const original = Element.prototype.scrollIntoView;
		Element.prototype.scrollIntoView = function (arg?: unknown) {
			scrolls.push(arg);
			return original.call(this, arg as ScrollIntoViewOptions);
		};
	});
}

/**
 * The distinct transforms the diagram's viewport takes, in order: the one
 * before `act`, then one per change the viewport makes because of it. An
 * instant change is two; an animated one passes through many.
 *
 * It records on every change to the viewport's style, from before `act` until
 * the viewport has changed at least once and then held still for 300ms (an
 * eased zoom changes on every frame, so a pause is its end). A fixed window
 * begun before `act` could close before a slow `act` had moved anything, and
 * read as an instant change.
 */
async function viewportSteps(
	flow: Locator,
	act: () => Promise<void>,
): Promise<string[]> {
	await flow.evaluate((el) => {
		const viewport = el.querySelector(".svelte-flow__viewport") as HTMLElement;
		const seen = [viewport.style.transform];
		const state = { seen, lastChange: performance.now() };
		new MutationObserver(() => {
			const now = viewport.style.transform;
			if (seen[seen.length - 1] === now) return;
			seen.push(now);
			state.lastChange = performance.now();
		}).observe(viewport, { attributes: true, attributeFilter: ["style"] });
		(window as unknown as { viewportSteps: typeof state }).viewportSteps =
			state;
	});
	// A map that is still fitting itself on load is not a starting point.
	await expect
		.poll(() =>
			flow.evaluate(
				(_, settle) =>
					performance.now() -
						(window as unknown as { viewportSteps: { lastChange: number } })
							.viewportSteps.lastChange >=
					settle,
				300,
			),
		)
		.toBe(true);
	await flow.evaluate(() => {
		const s = (
			window as unknown as {
				viewportSteps: { seen: string[]; lastChange: number };
			}
		).viewportSteps;
		s.seen.splice(0, s.seen.length - 1);
	});
	await act();
	await expect
		.poll(
			() =>
				flow.evaluate((_, settle) => {
					const s = (
						window as unknown as {
							viewportSteps: { seen: string[]; lastChange: number };
						}
					).viewportSteps;
					return (
						s.seen.length > 1 && performance.now() - s.lastChange >= settle
					);
				}, 300),
			{ message: "the viewport to change and then hold still" },
		)
		.toBe(true);
	return flow.evaluate(
		() =>
			(window as unknown as { viewportSteps: { seen: string[] } }).viewportSteps
				.seen,
	);
}

for (const host of ["viewer", "export"] as const) {
	test.describe(`${host}: motion follows prefers-reduced-motion`, () => {
		test("no CSS animation runs and none is declared, and it does when motion is allowed", async ({
			page,
		}) => {
			await page.emulateMedia({ reducedMotion: "no-preference" });
			const flow = await openDiagram(page, host, "Context map", "");
			await expect(
				flow.locator(".svelte-flow__edge.animated").first(),
			).toBeAttached();
			const runningBefore = await page.evaluate(
				() =>
					document.getAnimations().filter((a) => a.playState === "running")
						.length,
			);
			// The control: with no preference the edges' dashes are marching.
			expect(runningBefore).toBeGreaterThan(0);

			await page.emulateMedia({ reducedMotion: "reduce" });
			await expect
				.poll(() =>
					page.evaluate(
						() =>
							document.getAnimations().filter((a) => a.playState === "running")
								.length,
					),
				)
				.toBe(0);
			// Nor is any left declared: every element's computed durations are nil.
			const moving = await page.evaluate(() => {
				const ms = (value: string) =>
					Math.max(
						...value
							.split(",")
							.map(
								(v) =>
									Number.parseFloat(v) * (v.trim().endsWith("ms") ? 1 : 1000),
							),
					);
				return [...document.querySelectorAll("*")]
					.filter((el) => {
						const s = getComputedStyle(el);
						return (
							ms(s.transitionDuration) > 1 ||
							(s.animationName !== "none" && ms(s.animationDuration) > 1)
						);
					})
					.map((el) => `${el.tagName}.${(el as HTMLElement).className}`);
			});
			expect(moving).toEqual([]);
		});

		test("a table-of-contents jump scrolls at once, and smoothly when motion is allowed", async ({
			page,
		}) => {
			await spyOnScrolling(page);
			await page.emulateMedia({ reducedMotion: "no-preference" });
			await openDiagram(page, host, "Context map", "");
			await page.locator(".toc a").first().click();
			expect(
				await page.evaluate(
					() =>
						(
							window as unknown as { scrolls: { behavior?: string }[] }
						).scrolls.at(-1)?.behavior,
				),
			).toBe("smooth");

			await page.emulateMedia({ reducedMotion: "reduce" });
			await page.locator(".toc a").nth(1).click();
			expect(
				await page.evaluate(
					() =>
						(
							window as unknown as { scrolls: { behavior?: string }[] }
						).scrolls.at(-1)?.behavior,
				),
			).not.toBe("smooth");
		});

		test("a double click zooms the map at once, and eases when motion is allowed", async ({
			page,
		}) => {
			const zoom = (flow: Locator) =>
				viewportSteps(flow, () =>
					flow
						.locator(".svelte-flow__pane")
						.dblclick({ position: { x: 5, y: 5 } }),
				);
			await page.emulateMedia({ reducedMotion: "no-preference" });
			let flow = await openDiagram(page, host, "Context map", "");
			// The control: the library's own double-click zoom is a 250ms transition.
			expect((await zoom(flow)).length).toBeGreaterThan(3);

			await page.emulateMedia({ reducedMotion: "reduce" });
			flow = await openDiagram(page, host, "Context map", "");
			const steps = await zoom(flow);
			// The gesture still works, and lands at once: from the fitted zoom to
			// the next step in, with nothing sampled between.
			expect(steps.length).toBeLessThanOrEqual(2);
			expect(steps).toHaveLength(2);
			const scale = (t: string) => Number(/scale\(([\d.]+)\)/.exec(t)?.[1]);
			expect(scale(steps[1])).toBeGreaterThan(scale(steps[0]));
		});

		test("the fit control and fullscreen refit the map at once, whatever the preference", async ({
			page,
		}) => {
			for (const reducedMotion of ["no-preference", "reduce"] as const) {
				await page.emulateMedia({ reducedMotion });
				const flow = await openDiagram(page, host, "Context map", "");
				// Move the map off its fit first, so refitting has somewhere to travel.
				await flow.getByRole("button", { name: "Zoom In" }).click();
				const fit = await viewportSteps(flow, () =>
					flow.getByRole("button", { name: "Fit View" }).click(),
				);
				expect(fit.length, `fit view, ${reducedMotion}`).toBeLessThanOrEqual(2);
				const fullscreen = await viewportSteps(flow, () =>
					flow.getByRole("button", { name: "Enter fullscreen" }).click(),
				);
				// One step for the overlay's new box and one for the refit into it.
				expect(
					fullscreen.length,
					`fullscreen, ${reducedMotion}`,
				).toBeLessThanOrEqual(3);
				await flow.getByRole("button", { name: "Exit fullscreen" }).click();
				await expect(page.locator(".interactive.fullscreen")).toHaveCount(0);
			}
		});

		test("a ref that lands on a row marks it, fading only when motion is allowed", async ({
			page,
		}) => {
			const row = page.locator(`tr[id="${ATTRIBUTE_REF}"]`);
			await page.emulateMedia({ reducedMotion: "no-preference" });
			await openPage(page, host, ATTRIBUTE_REF);
			await expect(row).toHaveClass(/flash/);
			expect(
				await row.evaluate((el) => getComputedStyle(el).animationName),
			).toBe("flash");

			await page.emulateMedia({ reducedMotion: "reduce" });
			// No fade, but the row is still marked: a reader who cannot be
			// shown motion still has to be shown where the ref landed.
			expect(
				await row.evaluate((el) => getComputedStyle(el).animationName),
			).toBe("none");
			expect(
				await row.evaluate((el) => getComputedStyle(el).backgroundColor),
			).not.toBe("rgba(0, 0, 0, 0)");
		});
	});
}
