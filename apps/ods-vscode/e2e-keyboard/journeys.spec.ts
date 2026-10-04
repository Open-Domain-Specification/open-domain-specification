import {
	cpSync,
	mkdtempSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { expect, type Frame, type Page, test } from "@playwright/test";
import {
	expectClear,
	expectFilled,
	settledFit,
	sizeOf,
} from "../../../packages/pages/e2e/diagram-fit";
import {
	emulateReducedMotion,
	type Host,
	launchVSCode,
	openPageByKeyboard,
	webviewContentFrame,
} from "./host";

/**
 * Epic #61's keyboard, focus, motion and layout journeys in the real VS Code
 * webview (host 1.96.4), where the same Svelte bundle runs as in the viewer
 * and the static export. Every activation is a real key or pointer event sent
 * to the workbench window by Playwright's Electron support. The webview's DOM
 * is only read, to assert what the keys did.
 *
 * The extension's webview is the "embedded" bundle: no import screen (#45), no
 * workspace tree (so #50 has `main`, the crumbs and the contents), and host
 * messages (`model`, `navigate`) drive the page the reader did not ask for.
 */

const TRANSPARENT = /^(transparent|rgba\(\s*\d+,\s*\d+,\s*\d+,\s*0\s*\))$/;

const active = (frame: Frame) =>
	frame.evaluate(() => {
		const el = document.activeElement as HTMLElement | null;
		return {
			tag: el?.tagName ?? null,
			text: el?.textContent?.trim().slice(0, 80) ?? "",
			href: el?.getAttribute("href") ?? null,
			label: el?.getAttribute("aria-label") ?? null,
			inMain: !!el?.closest("main"),
			inFlow: !!el?.closest(".svelte-flow"),
			inDiagram: !!el?.closest(".interactive"),
			inToc: !!el?.closest("nav.toc"),
			isH1: el?.matches("main h1") ?? false,
			tabindex: el?.getAttribute("tabindex") ?? null,
		};
	});

type Stop = Awaited<ReturnType<typeof active>>;

/**
 * Asserts the element is PAINTED where a reader can see it, which
 * `toBeVisible()` does not: it reads the box and the style, so an element
 * moved off the window by a transformed ancestor, or clipped away by an
 * ancestor's overflow, still passes. Its box lies inside the webview's
 * viewport, and `document.elementFromPoint` at its centre and just inside its
 * top-left corner answers with the element or a descendant.
 */
async function expectOnScreen(frame: Frame, selector: string, when: string) {
	const seen = await frame
		.locator(selector)
		.first()
		.evaluate((el) => {
			const b = el.getBoundingClientRect();
			const width = document.documentElement.clientWidth;
			const height = document.documentElement.clientHeight;
			const owns = (hit: Element | null) => hit !== null && el.contains(hit);
			const label = (hit: Element | null) =>
				hit === null ? null : `${hit.tagName.toLowerCase()}.${hit.className}`;
			const centre = document.elementFromPoint(
				b.left + b.width / 2,
				b.top + b.height / 2,
			);
			const corner = document.elementFromPoint(b.left + 2, b.top + 2);
			return {
				box: { left: b.left, top: b.top, right: b.right, bottom: b.bottom },
				viewport: { width, height },
				inside:
					b.width > 0 &&
					b.height > 0 &&
					b.left >= 0 &&
					b.top >= 0 &&
					b.right <= width &&
					b.bottom <= height,
				centre: label(centre),
				corner: label(corner),
				painted: owns(centre) && owns(corner),
			};
		});
	expect(
		seen.inside,
		`${when}: inside the webview ${JSON.stringify(seen)}`,
	).toBe(true);
	expect(seen.painted, `${when}: painted ${JSON.stringify(seen)}`).toBe(true);
}

/** Presses `key` until the focused element satisfies `test`; fails with the trail. */
async function pressUntil(
	host: Host,
	frame: Frame,
	test: (stop: Stop) => boolean,
	what: string,
	key = "Tab",
	limit = 80,
): Promise<Stop> {
	const trail: string[] = [];
	for (let i = 0; i < limit; i++) {
		await host.window.keyboard.press(key);
		const now = await active(frame);
		trail.push(`${now.tag}:${(now.label ?? now.text).slice(0, 24)}`);
		if (test(now)) return now;
	}
	throw new Error(`${key} never reached ${what}; trail: ${trail.join(" | ")}`);
}

const tabToLink = (host: Host, frame: Frame, href: string) =>
	pressUntil(host, frame, (s) => s.href === href, `link ${href}`);

const tabToLabel = (host: Host, frame: Frame, label: string, key = "Tab") =>
	pressUntil(host, frame, (s) => s.label === label, `"${label}"`, key);

const TOLERATED_BADGE = ".port.stereotype.tolerated button";

/**
 * Puts the workbench in a known state without touching what is under test:
 * the page is opened by the extension's own search, then focus is dropped so
 * the next real Tab starts from the top of the webview.
 */
async function openOrders(host: Host): Promise<Frame> {
	await openPageByKeyboard(host.window, "Orders");
	const frame = await webviewContentFrame(host.window);
	await expect(frame.locator("main h1")).toContainText("Orders");
	await frame.evaluate(() => {
		(document.activeElement as HTMLElement | null)?.blur();
		window.scrollTo(0, 0);
		// Put the sequential-focus starting point at the top of the page, so a
		// Tab starts there whatever the pointer last clicked.
		const h1 = document.querySelector("main h1") as HTMLElement;
		h1.focus({ preventScroll: true });
		h1.blur();
	});
	return frame;
}

/** The window's content size; the webview is the editor area inside it. */
const resize = (host: Host, width: number, height: number) =>
	host.app.evaluate(
		({ BrowserWindow }, size) =>
			BrowserWindow.getAllWindows()[0].setContentSize(size.w, size.h),
		{ w: width, h: height },
	);

const runningAnimations = (frame: Frame) =>
	frame.evaluate(
		() =>
			document.getAnimations().filter((a) => a.playState === "running").length,
	);

/**
 * The distinct transforms of the diagram viewport, in order: the one before
 * `act`, then one per change the viewport makes because of it. An instant
 * change is two; an eased one passes through many.
 *
 * It records on every change to the viewport's style, from before `act` until
 * the viewport has changed at least once and then held still for 300ms (an
 * eased zoom changes on every frame, so a pause is its end). A fixed window
 * begun before `act` could close before a slow `act` (a double click in a busy
 * host) had moved anything, and read as an instant change.
 */
async function viewportSteps(
	frame: Frame,
	act: () => Promise<void>,
): Promise<string[]> {
	await frame.evaluate(() => {
		const viewport = document.querySelector(
			".svelte-flow__viewport",
		) as HTMLElement;
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
			frame.evaluate(
				() =>
					performance.now() -
						(window as unknown as { viewportSteps: { lastChange: number } })
							.viewportSteps.lastChange >=
					300,
			),
		)
		.toBe(true);
	await frame.evaluate(() => {
		const s = (
			window as unknown as {
				viewportSteps: { seen: string[]; lastChange: number };
			}
		).viewportSteps;
		s.seen.splice(0, s.seen.length - 1);
	});
	await act();
	const handle = await frame.evaluateHandle(
		() =>
			(
				window as unknown as {
					viewportSteps: { seen: string[]; lastChange: number };
				}
			).viewportSteps,
	);
	await expect
		.poll(
			() =>
				handle.evaluate(
					(s) => s.seen.length > 1 && performance.now() - s.lastChange >= 300,
				),
			{ message: "the viewport to change and then hold still" },
		)
		.toBe(true);
	return handle.evaluate((s) => s.seen);
}

/** Double-clicks the pane of the diagram with the real pointer. */
async function dblclickPane(window: Page, frame: Frame) {
	await frame.locator(".svelte-flow__pane").scrollIntoViewIfNeeded();
	const box = await frame.locator(".svelte-flow__pane").boundingBox();
	if (!box) throw new Error("no diagram pane box");
	await window.mouse.dblclick(box.x + 5, box.y + 5);
}

test.describe("focus, landmarks and states on a page", () => {
	let host: Host;
	test.beforeAll(async () => {
		host = await launchVSCode({ folder: "src/test/fixtures/cross-surface" });
		// Wide enough that the contents column is drawn (it goes under 900px).
		await resize(host, 1300, 900);
	});
	test.afterAll(async () => {
		await host.close();
	});

	// #45: the webview is only ever handed a model by the host, so there is no
	// import screen, no URL field, no upload and no example card to announce.
	test("#45 import announcements are not applicable: the webview never draws the import screen", async () => {
		const frame = await openOrders(host);
		expect(
			await frame.evaluate(() => ({
				importScreen: document.querySelector(".import, input[type=file]"),
				urlField: document.querySelector("input[type=url], input[type=text]"),
				live: document.querySelectorAll("[role=status], [aria-live]").length,
			})),
		).toMatchObject({ importScreen: null, urlField: null });
	});

	test("#46 Enter on a page link focuses the destination heading, and the next Tab goes inside main", async () => {
		const frame = await openOrders(host);
		expect((await active(frame)).tag).toBe("BODY");
		await tabToLink(host, frame, "#/boundedcontexts/billing");
		await host.window.keyboard.press("Enter");
		await expect(frame.locator("main h1")).toContainText("Billing");
		const now = await active(frame);
		expect(now.isH1).toBe(true);
		expect(now.tabindex).toBe("-1");
		expect(await frame.evaluate(() => location.hash)).toBe(
			"#/boundedcontexts/billing",
		);
		await host.window.keyboard.press("Tab");
		const next = await active(frame);
		expect(next.isH1).toBe(false);
		expect(next.inMain).toBe(true);
	});

	test("#46 Enter on a contents entry focuses its section heading, and the next Tab stays in the page", async () => {
		const frame = await openOrders(host);
		const entries = frame.locator("nav.toc a");
		// "Strategic position" has controls in it, so the next Tab has somewhere to go.
		const entry = entries.filter({ hasText: "Strategic position" });
		const id = ((await entry.getAttribute("href")) as string).slice(1);
		const href = `#${id}`;
		await pressUntil(host, frame, (s) => s.href === href, `toc entry ${href}`);
		await host.window.keyboard.press("Enter");
		const heading = frame.locator(`section#${id} > .heading`).first();
		await expect(heading).toBeFocused();
		expect(await heading.getAttribute("tabindex")).toBe("-1");
		await host.window.keyboard.press("Tab");
		const next = await active(frame);
		expect(next.inMain).toBe(true);
		expect(next.tabindex).not.toBe("-1");
	});

	test("#46 a page the extension opens does not take focus into the webview", async () => {
		const frame = await openOrders(host);
		// The extension's own search, a real key journey through the palette,
		// sends the webview a navigate message. The reader's focus was in the
		// workbench and must stay out of the page.
		await openPageByKeyboard(host.window, "Billing");
		await expect(frame.locator("main h1")).toContainText("Billing");
		const now = await active(frame);
		expect(now.tag).toBe("BODY");
		expect(now.isH1).toBe(false);
	});

	test("#46 history: what the webview's router does with back and forward", async () => {
		const frame = await openOrders(host);
		await tabToLink(host, frame, "#/boundedcontexts/billing");
		await host.window.keyboard.press("Enter");
		await expect(frame.locator("main h1")).toContainText("Billing");
		await host.window.keyboard.press("Tab");
		// A webview has no back button and VS Code binds no key to the page's own
		// history, so the router is reached by history.back(), the one thing that
		// fires the same hashchange a browser's back button does.
		const length = await frame.evaluate(() => history.length);
		await frame.evaluate(() => history.back());
		await expect(frame.locator("main h1")).toContainText("Orders");
		expect((await active(frame)).isH1).toBe(true);
		await frame.evaluate(() => history.forward());
		await expect(frame.locator("main h1")).toContainText("Billing");
		expect((await active(frame)).isH1).toBe(true);
		console.log(`history.length in the webview: ${length}`);
	});

	test("#50 the webview draws main, the named crumbs and contents, and no workspace tree", async () => {
		const frame = await openOrders(host);
		expect(
			await frame.evaluate(() => ({
				main: document.querySelectorAll("main").length,
				tree: document.querySelectorAll("nav.tree").length,
				navs: [...document.querySelectorAll("nav")].map((n) => [
					n.className.split(" ")[0],
					n.getAttribute("aria-label"),
				]),
				treeCurrent: document.querySelectorAll("nav.tree [aria-current]")
					.length,
			})),
		).toEqual({
			main: 1,
			tree: 0,
			navs: [
				["crumbs", "Breadcrumb"],
				["toc", "On this page"],
			],
			treeCurrent: 0,
		});
		// Every navigation is named, and the names are distinct.
		await expect(
			frame.getByRole("navigation", { name: "Breadcrumb" }),
		).toHaveCount(1);
		await expect(
			frame.getByRole("navigation", { name: "On this page" }),
		).toHaveCount(1);
		await expect(frame.getByRole("main")).toHaveCount(1);

		// In a narrow editor tab the contents column goes, by design.
		await resize(host, 900, 700);
		await expect(
			frame.getByRole("navigation", { name: "On this page" }),
		).toHaveCount(0);
		await resize(host, 1300, 900);
		await expect(
			frame.getByRole("navigation", { name: "On this page" }),
		).toHaveCount(1);
	});

	test("#52 a real Tab draws a visible focus ring from the theme, and a real hover washes a table row", async () => {
		const frame = await openOrders(host);
		await tabToLink(host, frame, "#/boundedcontexts/billing");
		const ring = await frame.evaluate(() => {
			const el = document.activeElement as HTMLElement;
			const s = getComputedStyle(el);
			return {
				focusVisible: el.matches(":focus-visible"),
				outlineStyle: s.outlineStyle,
				outlineWidth: Number.parseFloat(s.outlineWidth),
				outlineColor: s.outlineColor,
				boxShadow: s.boxShadow,
				focusBorder: getComputedStyle(document.documentElement)
					.getPropertyValue("--vscode-focusBorder")
					.trim(),
			};
		});
		expect(ring.focusVisible).toBe(true);
		// The real theme supplies the token; a viewer's stylesheet is not involved.
		expect(ring.focusBorder).not.toBe("");
		const outline =
			ring.outlineStyle !== "none" &&
			ring.outlineWidth > 0 &&
			!TRANSPARENT.test(ring.outlineColor);
		expect(outline || ring.boxShadow !== "none", JSON.stringify(ring)).toBe(
			true,
		);

		const row = frame
			.locator(".strategic-position tbody tr:not(.group, .detail)")
			.first();
		await row.scrollIntoViewIfNeeded();
		const bg = () => row.evaluate((el) => getComputedStyle(el).backgroundColor);
		await host.window.mouse.move(2, 2);
		const before = await bg();
		const box = await row.boundingBox();
		if (!box) throw new Error("no row box");
		await host.window.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await expect.poll(bg).not.toBe(before);
		expect(await bg()).not.toMatch(TRANSPARENT);
	});
});

test.describe("diagram nodes and evidence", () => {
	let host: Host;
	test.beforeAll(async () => {
		host = await launchVSCode({ folder: "src/test/fixtures/cross-surface" });
		// Wide enough that the contents column is drawn (it goes under 900px).
		await resize(host, 1300, 900);
	});
	test.afterAll(async () => {
		await host.close();
	});

	test("#47 nodes are named '<name>, <kind>', reached with Tab, and no edge is a stop", async () => {
		const frame = await openOrders(host);
		const names = await frame
			.locator(".svelte-flow__node-context")
			.evaluateAll((els) => els.map((el) => el.getAttribute("aria-label")));
		expect(names).toEqual([
			"Orders, bounded context",
			"Billing, bounded context",
			"Shipping, bounded context",
		]);
		await expect(
			frame.getByRole("link", { name: "Orders, bounded context" }),
		).toHaveCount(1);

		// Tab from the top of the page into the diagram, then through it. The
		// first stop inside it is the bypass (#83), which is not part of the map.
		const entry = await pressUntil(
			host,
			frame,
			(s) => s.inDiagram,
			"the diagram",
		);
		expect(entry.text).toMatch(/^Skip diagram: /);
		const stops: Stop[] = [];
		for (let i = 0; i < 40; i++) {
			await host.window.keyboard.press("Tab");
			const now = await active(frame);
			if (!now.inDiagram) break;
			stops.push(now);
		}
		const labels = stops.map((s) => s.label);
		expect(labels.filter((l) => /^Edge from/.test(l ?? ""))).toEqual([]);
		expect(labels.filter((l) => l?.endsWith(", bounded context"))).toEqual(
			names,
		);
		// The ring is drawn on a focused node.
		await tabToLabel(host, frame, "Orders, bounded context", "Shift+Tab");
		expect(
			await frame.evaluate(() => {
				const el = document.activeElement as HTMLElement;
				return [
					el.matches(":focus-visible"),
					getComputedStyle(el).outlineStyle,
				];
			}),
		).toEqual([true, "solid"]);
	});

	test("#83 the first stop inside a diagram is its bypass, and activating it lands beyond the diagram", async () => {
		for (const key of ["Enter", " "]) {
			const frame = await openOrders(host);
			const entry = await pressUntil(
				host,
				frame,
				(s) => s.inDiagram,
				"the diagram",
			);
			// A native button, named for the figure, ahead of every badge, node and control.
			expect(entry.tag).toBe("BUTTON");
			expect(entry.text).toMatch(/^Skip diagram: .+/);
			const first = await frame.evaluate(() => {
				const box = document.activeElement?.closest(".interactive");
				return (
					box?.querySelector("a[href], button, select, [tabindex='0']") ===
					document.activeElement
				);
			});
			expect(first).toBe(true);

			await host.window.keyboard.press(key);
			const landed = await active(frame);
			expect(landed.tag).toBe("FIGCAPTION");
			expect(landed.inDiagram).toBe(false);
			// The Tab stop before the bypass may have opened its explanation; that
			// layer closes on the ordinary blur lifecycle, so the settled state is
			// asserted: the focused caption, unchanged predicate, polled until painted.
			await expect(async () => {
				await expectOnScreen(frame, "figcaption:focus", "the caption");
			}).toPass({ timeout: 5000 });

			// The next Tab is the first stop beyond every stop of the diagram.
			await host.window.keyboard.press("Tab");
			const next = await active(frame);
			expect(next.inDiagram).toBe(false);
			expect(next.tag).not.toBe("FIGCAPTION");
		}
	});

	test("#47 Enter opens the page of the focused node", async () => {
		const frame = await openOrders(host);
		await tabToLabel(host, frame, "Billing, bounded context");
		await host.window.keyboard.press("Enter");
		await expect(frame.locator("main h1")).toContainText("Billing");
		expect(await frame.evaluate(() => location.hash)).toBe(
			"#/boundedcontexts/billing",
		);
	});

	test("#47 Space opens it too, and takes the key so the page does not scroll", async () => {
		const frame = await openOrders(host);
		await tabToLabel(host, frame, "Shipping, bounded context");
		await frame.evaluate(() => {
			window.addEventListener("keydown", (e) => {
				(window as unknown as { spaceTaken: boolean }).spaceTaken =
					e.defaultPrevented;
			});
		});
		await host.window.keyboard.press(" ");
		await expect(frame.locator("main h1")).toContainText("Shipping");
		expect(
			await frame.evaluate(
				() => (window as unknown as { spaceTaken: boolean }).spaceTaken,
			),
		).toBe(true);
	});

	test("#48 Enter on a badge opens the evidence card, Escape closes it and focus returns to the badge", async () => {
		for (const key of ["Enter", " "]) {
			const frame = await openOrders(host);
			const badge = frame.locator(TOLERATED_BADGE);
			await expect(badge).toHaveCount(1);
			await expect(badge).toHaveAttribute("aria-haspopup", "dialog");
			await expect(badge).toHaveAttribute("aria-expanded", "false");
			const label = (await badge.getAttribute("aria-label")) as string;
			await tabToLabel(host, frame, label);
			await expect(badge).toBeFocused();

			await host.window.keyboard.press(key);
			const card = frame.getByRole("dialog");
			await expect(card).toBeVisible();
			await expect(badge).toHaveAttribute("aria-expanded", "true");
			const id = await card.getAttribute("id");
			await expect(badge).toHaveAttribute("aria-controls", id as string);
			expect(
				await card.evaluate((el) => el.contains(document.activeElement)),
			).toBe(true);

			await host.window.keyboard.press("Escape");
			await expect(frame.getByRole("dialog")).toHaveCount(0);
			await expect(badge).toBeFocused();
			await expect(badge).toHaveAttribute("aria-expanded", "false");
		}
	});

	test("#48 in fullscreen the first Escape closes only the card", async () => {
		const frame = await openOrders(host);
		const badge = frame.locator(TOLERATED_BADGE);
		await tabToLabel(host, frame, "Enter fullscreen");
		await host.window.keyboard.press("Enter");
		const diagram = frame.locator(".interactive.fullscreen");
		await expect(diagram).toHaveCount(1);
		// The badges come before the controls in reading order.
		await tabToLabel(
			host,
			frame,
			(await badge.getAttribute("aria-label")) as string,
			"Shift+Tab",
		);
		await expect(badge).toBeFocused();
		await host.window.keyboard.press("Enter");
		await expect(frame.getByRole("dialog")).toBeVisible();

		await host.window.keyboard.press("Escape");
		await expect(frame.getByRole("dialog")).toHaveCount(0);
		await expect(badge).toBeFocused();
		await expect(diagram).toHaveCount(1);

		await host.window.keyboard.press("Escape");
		await expect(diagram).toHaveCount(0);
	});
});

test.describe("Escape closes the innermost layer", () => {
	let host: Host;
	test.beforeAll(async () => {
		host = await launchVSCode({ folder: "src/test/fixtures/cross-surface" });
		await resize(host, 1300, 900);
	});
	test.afterAll(async () => {
		await host.close();
	});

	const PATTERN_TRIGGER = ".anchored .pattern-hover .trigger";

	for (const fullscreen of [false, true]) {
		test(`#48 pattern explanation, then the evidence card${fullscreen ? ", then fullscreen" : ""}, one layer a key`, async () => {
			const frame = await openOrders(host);
			const badge = frame.locator(TOLERATED_BADGE);
			const overlay = frame.locator(".interactive.fullscreen");
			const badgeLabel = (await badge.getAttribute("aria-label")) as string;
			if (fullscreen) {
				await tabToLabel(host, frame, "Enter fullscreen");
				await host.window.keyboard.press("Enter");
				await expect(overlay).toHaveCount(1);
				await tabToLabel(host, frame, badgeLabel, "Shift+Tab");
			} else {
				await tabToLabel(host, frame, badgeLabel);
			}
			await expect(badge).toBeFocused();
			await host.window.keyboard.press("Enter");
			const card = frame.getByRole("dialog");
			await expect(card).toBeVisible();

			// Tab to a pattern keyword inside the card: its explanation opens.
			await pressUntil(
				host,
				frame,
				(stop) =>
					stop.tag === "BUTTON" && stop.label === null && stop.text !== "",
				"a pattern keyword in the card",
			);
			await expect(frame.locator(PATTERN_TRIGGER).first()).toBeFocused();
			const explanation = card.getByRole("tooltip");
			await expect(explanation).toBeVisible();
			await expectOnScreen(frame, ".layer", "the explanation in the card");

			await host.window.keyboard.press("Escape");
			await expect(explanation).toHaveCount(0);
			await expect(card).toBeVisible();
			await expect(frame.locator(PATTERN_TRIGGER).first()).toBeFocused();
			if (fullscreen) await expect(overlay).toHaveCount(1);

			await host.window.keyboard.press("Escape");
			await expect(frame.getByRole("dialog")).toHaveCount(0);
			await expect(badge).toBeFocused();
			if (fullscreen) {
				await expect(overlay).toHaveCount(1);
				await host.window.keyboard.press("Escape");
				await expect(overlay).toHaveCount(0);
			}
		});
	}
});

test.describe("an explanation taller than the room", () => {
	let host: Host;
	test.beforeAll(async () => {
		host = await launchVSCode({ folder: "src/test/fixtures/cross-surface" });
	});
	test.afterAll(async () => {
		await host.close();
	});

	test("#48 stays inside the webview and scrolls, however often a scroll places it again", async () => {
		// As short as the workbench lets the window be, so that what a keyword
		// explains is taller than the room above or below it.
		await resize(host, 1300, 300);
		const frame = await openOrders(host);
		const badge = frame.locator(TOLERATED_BADGE);
		await tabToLabel(
			host,
			frame,
			(await badge.getAttribute("aria-label")) as string,
		);
		await host.window.keyboard.press("Enter");
		const card = frame.getByRole("dialog");
		await expect(card).toBeVisible();
		await pressUntil(
			host,
			frame,
			(stop) =>
				stop.tag === "BUTTON" && stop.label === null && stop.text !== "",
			"a pattern keyword in the card",
		);
		await expect(card.getByRole("tooltip")).toBeVisible();

		const measure = () =>
			frame.evaluate(() => {
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
			await expectOnScreen(frame, ".layer", when);
			const m = await measure();
			expect(m.top, `${when}: top`).toBeGreaterThanOrEqual(0);
			expect(m.bottom, `${when}: bottom`).toBeLessThanOrEqual(m.viewport);
			expect(m.cap, `${when}: capped`).not.toBe("");
			expect(m.scrollHeight, `${when}: content`).toBeGreaterThan(
				m.clientHeight,
			);
			return m;
		};
		const first = await contained("opened");
		for (let i = 1; i <= 5; i += 1) {
			await frame.evaluate(() => {
				document
					.querySelector(".svelte-flow")
					?.dispatchEvent(new Event("scroll"));
			});
			await frame.evaluate(
				() =>
					new Promise((done) =>
						requestAnimationFrame(() =>
							requestAnimationFrame(() => done(null)),
						),
					),
			);
			await expect(card.getByRole("tooltip")).toBeVisible();
			const again = await contained(`after scroll ${i}`);
			expect(again.height, `after scroll ${i}: same height`).toBeCloseTo(
				first.height,
				0,
			);
			expect(again.cap, `after scroll ${i}: same cap`).toBe(first.cap);
		}
		// Brought to the foot, and still there once scrolling and layout have
		// settled: a read in the same callback comes before the scroll event.
		await frame.evaluate(() => {
			const layer = document.querySelector(".layer") as HTMLElement;
			layer.scrollTop = layer.scrollHeight;
		});
		await settleFrame(frame);
		const scrolled = await frame.evaluate(
			() => (document.querySelector(".layer") as HTMLElement).scrollTop,
		);
		expect(scrolled).toBeGreaterThan(0);
	});
});

/**
 * Waits until scrolling and layout have stopped: the explanation's scroll
 * position and box and the focused element's box are unchanged for six frames
 * running, after a short idle. The browser's scroll to reveal a focused
 * element, and whatever the page does about it, land after the key press, so
 * a read in the same callback sees neither.
 */
async function settleFrame(frame: Frame) {
	await frame.waitForTimeout(150);
	await frame.evaluate(
		() =>
			new Promise<void>((done) => {
				const sign = () => {
					const layer = document.querySelector(".layer") as HTMLElement | null;
					const at = document.activeElement as HTMLElement | null;
					const box = (el: Element | null) => {
						const b = el?.getBoundingClientRect();
						return b ? [b.left, b.top, b.right, b.bottom].join() : "";
					};
					return [layer?.scrollTop, box(layer), box(at)].join("|");
				};
				let last = sign();
				let same = 0;
				let frames = 0;
				const tick = () => {
					const now = sign();
					same = now === last ? same + 1 : 0;
					last = now;
					frames += 1;
					if (same >= 6 || frames > 300) done();
					else requestAnimationFrame(tick);
				};
				requestAnimationFrame(tick);
			}),
	);
}

/** The focused element inside the explanation against the explanation's box, and what is painted at it. */
const measureCitation = (frame: Frame) =>
	frame.evaluate(() => {
		const layer = document.querySelector(".layer") as HTMLElement;
		const cit = document.activeElement as HTMLElement;
		const l = layer.getBoundingClientRect();
		const c = cit.getBoundingClientRect();
		// A link that wraps is one box over several lines: hit-test its last line.
		const lines = cit.getClientRects();
		const last = lines[lines.length - 1];
		const hit = document.elementFromPoint(
			last.left + last.width / 2,
			last.top + last.height / 2,
		);
		return {
			focused: layer.contains(cit) && cit !== layer,
			scrollTop: layer.scrollTop,
			maxScroll: layer.scrollHeight - layer.clientHeight,
			layer: { top: l.top, bottom: l.bottom },
			citation: { top: c.top, bottom: c.bottom },
			inside: c.top >= l.top - 1 && c.bottom <= l.bottom + 1,
			hitIsCitation: hit !== null && cit.contains(hit),
		};
	});

test.describe("a citation in an explanation that scrolls", () => {
	let host: Host;
	test.beforeAll(async () => {
		// A workspace whose tolerated relationship has a long comment and a
		// citation, so the explanation is taller than the room it has.
		host = await launchVSCode({ folder: "src/test/fixtures/long-evidence" });
	});
	test.afterAll(async () => {
		await host.close();
	});

	test("#48 Tab into the citation keeps it in view and hit-testable, and a keyword that moves keeps the reader's place", async () => {
		await resize(host, 1300, 300);
		const frame = await openOrders(host);
		const badge = frame.locator(TOLERATED_BADGE);
		await tabToLabel(
			host,
			frame,
			(await badge.getAttribute("aria-label")) as string,
		);
		await host.window.keyboard.press("Enter");
		await expect(frame.getByRole("dialog")).toBeVisible();
		await pressUntil(
			host,
			frame,
			(stop) =>
				stop.tag === "BUTTON" && stop.label === null && stop.text !== "",
			"a pattern keyword in the card",
		);
		await expect(frame.locator(".layer")).toBeVisible();

		// Tab from the keyword into the citation at the foot of its explanation.
		await host.window.keyboard.press("Tab");
		await expect(frame.locator(".layer a").first()).toBeFocused();
		await settleFrame(frame);
		const seen = await measureCitation(frame);
		const said = JSON.stringify(seen);
		expect(seen.focused, `focus is in the explanation ${said}`).toBe(true);
		expect(seen.maxScroll, `it scrolls ${said}`).toBeGreaterThan(0);
		expect(
			seen.scrollTop,
			`it scrolled to the citation ${said}`,
		).toBeGreaterThan(0);
		expect(seen.inside, `the citation is inside the explanation ${said}`).toBe(
			true,
		);
		expect(seen.hitIsCitation, `and is what is painted there ${said}`).toBe(
			true,
		);
		await expectOnScreen(frame, ".layer", "the explanation");

		// The keyword moves under it: the explanation is placed again, and the
		// reader keeps their place in it.
		await frame.evaluate(() => {
			const flow = document.querySelector(".svelte-flow") as HTMLElement;
			const room = document.createElement("div");
			room.style.cssText =
				"position:absolute;left:0;top:0;width:4000px;height:1px;pointer-events:none";
			flow.appendChild(room);
			flow.scrollLeft += 40;
		});
		await settleFrame(frame);
		const moved = await measureCitation(frame);
		const movedSaid = JSON.stringify(moved);
		expect(moved.focused, `still focused ${movedSaid}`).toBe(true);
		expect(
			Math.abs(moved.scrollTop - seen.scrollTop),
			`scroll kept ${movedSaid} from ${said}`,
		).toBeLessThan(1);
		expect(moved.inside, `still inside ${movedSaid}`).toBe(true);
		expect(moved.hitIsCitation, `still painted ${movedSaid}`).toBe(true);
	});
});

test.describe("reduced motion", () => {
	let host: Host;
	test.beforeAll(async () => {
		host = await launchVSCode({ folder: "src/test/fixtures/cross-surface" });
		// Wide enough that the contents column is drawn (it goes under 900px).
		await resize(host, 1300, 900);
	});
	test.afterAll(async () => {
		await emulateReducedMotion(host.window, "no-preference");
		await host.close();
	});

	test("#51 under reduce nothing animates and the map zooms and fits at once; with no preference it does not", async () => {
		await emulateReducedMotion(host.window, "no-preference");
		const frame = await openOrders(host);
		await expect(
			frame.locator(".svelte-flow__edge.animated").first(),
		).toBeAttached();
		// The control: motion is there to be switched off.
		expect(await runningAnimations(frame)).toBeGreaterThan(0);
		expect(
			(await viewportSteps(frame, () => dblclickPane(host.window, frame)))
				.length,
		).toBeGreaterThan(3);

		await emulateReducedMotion(host.window, "reduce");
		await expect.poll(() => runningAnimations(frame)).toBe(0);
		expect(
			await frame.evaluate(() => {
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
			}),
		).toEqual([]);

		// Fit with the real key: Tab to the control, Enter. Zoom Out first, so
		// fitting has somewhere to travel.
		await tabToLabel(host, frame, "Zoom Out");
		await host.window.keyboard.press("Enter");
		await tabToLabel(host, frame, "Fit View", "Tab");
		const fit = await viewportSteps(frame, () =>
			host.window.keyboard.press("Enter"),
		);
		expect(fit.length).toBeLessThanOrEqual(2);
		// A double click still zooms, and lands at once.
		await frame.evaluate(() => {
			(document.activeElement as HTMLElement | null)?.blur();
		});
		const steps = await viewportSteps(frame, () =>
			dblclickPane(host.window, frame),
		);
		expect(steps).toHaveLength(2);
		const scale = (t: string) => Number(/scale\(([\d.]+)\)/.exec(t)?.[1]);
		expect(scale(steps[1])).toBeGreaterThan(scale(steps[0]));
	});

	test("#51 a contents jump scrolls at once under reduce, and smoothly with no preference", async () => {
		const behaviours: (string | undefined)[] = [];
		for (const value of ["no-preference", "reduce"] as const) {
			await emulateReducedMotion(host.window, value);
			const frame = await openOrders(host);
			await frame.evaluate(() => {
				const scrolls: unknown[] = [];
				(window as unknown as { scrolls: unknown[] }).scrolls = scrolls;
				const original = Element.prototype.scrollIntoView;
				Element.prototype.scrollIntoView = function (arg?: unknown) {
					scrolls.push(arg);
					return original.call(this, arg as ScrollIntoViewOptions);
				};
			});
			await pressUntil(host, frame, (s) => s.inToc, "a contents entry");
			await host.window.keyboard.press("Enter");
			behaviours.push(
				await frame.evaluate(
					() =>
						(
							window as unknown as { scrolls: ({ behavior?: string } | null)[] }
						).scrolls
							// The contents jump asks for a behaviour; the focus that follows it
							// calls scrollIntoView with none.
							.filter((arg) => arg?.behavior)
							.at(-1)?.behavior,
				),
			);
		}
		expect(behaviours[0]).toBe("smooth");
		expect(behaviours[1]).not.toBe("smooth");
	});
});

test.describe("layout at the sizes a window takes", () => {
	let host: Host;
	test.beforeAll(async () => {
		host = await launchVSCode({ folder: "src/test/fixtures/cross-surface" });
		// Wide enough that the contents column is drawn (it goes under 900px).
		await resize(host, 1300, 900);
	});
	test.afterAll(async () => {
		await host.close();
	});

	// #42: the site tree does not exist in the webview, so 1300x900 is not the
	// webview's width, but the invariant is about the frame and the page and
	// holds at any width: the frame scrolls only when the prose is at its floor,
	// and the document never scrolls sideways.
	for (const [w, h] of [
		[1300, 900],
		[900, 700],
		[1800, 1000],
	]) {
		test(`#42 at a ${w}x${h} window the strategic table's frame scrolls only when the prose is at its floor`, async () => {
			await resize(host, w, h);
			const frame = await openOrders(host);
			await expect
				.poll(() => frame.evaluate(() => innerWidth), { timeout: 10_000 })
				.toBeGreaterThan(w / 3);
			const report = await frame.evaluate(() => {
				const doc = document.documentElement;
				return {
					pageOverflow: doc.scrollWidth - doc.clientWidth,
					webviewWidth: innerWidth,
					frames: [...document.querySelectorAll(".frame")]
						.map((frame) => {
							const cell = frame.querySelector(
								"tbody tr:not(.group, .detail) td.grow",
							);
							if (!cell) return null;
							const width = cell.getBoundingClientRect().width;
							const floor = Number.parseFloat(getComputedStyle(cell).minWidth);
							return {
								overflow: frame.scrollWidth - frame.clientWidth,
								width,
								floor,
							};
						})
						.filter((f) => f !== null),
				};
			});
			console.log(`window ${w}x${h}: ${JSON.stringify(report)}`);
			expect(report.pageOverflow).toBe(0);
			expect(report.frames.length).toBeGreaterThan(0);
			for (const f of report.frames) {
				expect(f.floor).toBeGreaterThan(0);
				expect(f.width).toBeGreaterThanOrEqual(f.floor - 1);
				const atFloor = f.width - f.floor <= 1;
				if (f.overflow > 0) expect(atFloor).toBe(true);
				if (!atFloor) expect(f.overflow).toBe(0);
			}
		});
	}
});

test.describe("the diagram fits the webview it is drawn in", () => {
	let host: Host;
	test.beforeAll(async () => {
		host = await launchVSCode({ folder: "src/test/fixtures/cross-surface" });
		await resize(host, 1300, 900);
	});
	test.afterAll(async () => {
		await host.close();
	});

	// #89, #90 and #86 in the real webview: the map fills its canvas clear of
	// the legend, the options, the controls and the minimap; the reader opening
	// the legend refits round it; fullscreen, entered and left by real keys,
	// fills the webview and gives the inline fit back. Every read waits for the
	// settled fit (`packages/pages/e2e/diagram-fit.ts`), never a frame count.
	test("#89 #90 #86 inline, with the legend toggled, and fullscreen by Enter and Escape", async () => {
		const frame = await openOrders(host);
		const flow = frame.locator(".svelte-flow").first();
		await flow.scrollIntoViewIfNeeded();
		const inline = await settledFit(flow);
		expectClear(inline, "the Orders map inline in the webview");
		expectFilled(inline, "the Orders map inline in the webview");

		const legend = flow.locator(".diagram-legend .legend-header");
		const was = await legend.getAttribute("aria-expanded");
		await legend.click();
		await expect(legend).not.toHaveAttribute("aria-expanded", was ?? "");
		const toggled = await settledFit(flow);
		expectClear(toggled, `the Orders map after the legend went from ${was}`);
		expectFilled(toggled, `the Orders map after the legend went from ${was}`);

		await tabToLabel(host, frame, "Enter fullscreen");
		await host.window.keyboard.press("Enter");
		await expect(frame.locator(".interactive.fullscreen")).toHaveCount(1);
		const full = await settledFit(flow);
		const screen = await frame.evaluate(() => [
			document.documentElement.clientWidth,
			document.documentElement.clientHeight,
		]);
		expect([
			full.view.left,
			full.view.top,
			full.view.right,
			full.view.bottom,
		]).toEqual([0, 0, ...screen]);
		expectClear(full, "the Orders map fullscreen in the webview");
		expectFilled(full, "the Orders map fullscreen in the webview");
		expect(full.zoom).toBeGreaterThan(toggled.zoom);

		await host.window.keyboard.press("Escape");
		await expect(frame.locator(".interactive.fullscreen")).toHaveCount(0);
		const back = await settledFit(flow);
		expect(sizeOf(back.view)).toEqual(sizeOf(toggled.view));
		expect(back.zoom).toBeCloseTo(toggled.zoom, 5);
		expectClear(back, "the Orders map after Escape");
	});
});

/**
 * Issue #77: Back and Forward in the page view's own toolbar, in the real
 * webview. The buttons are native, reached by Tab and Shift+Tab and activated
 * by Enter, Space or the pointer, and are disabled at the ends of the webview's
 * own history. Every page's identity is read as it is first reached (its hash
 * and heading), and each traversal must land on exactly that, heading focused.
 *
 * The first page the webview shows, root or not, is the first entry: Back is
 * disabled there instead of falling into whatever lies beneath it. A host that
 * has just opened a page for a different workspace file starts over.
 */
test.describe("history in the page toolbar", () => {
	type Where = { hash: string; heading: string };
	type Action = "back" | "forward";
	type How = "enter" | "space" | "click";

	let host: Host;
	let folder: string;

	/** The fixture, and a second workspace beside it whose names share nothing with the first. */
	function twoWorkspaces(): string {
		const root = mkdtempSync(join(tmpdir(), "ods-history-"));
		const fixture = resolve(
			__dirname,
			"../src/test/fixtures/cross-surface/.ods",
		);
		cpSync(fixture, join(root, ".ods"), { recursive: true });
		const second = JSON.parse(
			readFileSync(join(fixture, "cross_surface.json"), "utf8"),
		);
		second.name = "Zebra Model";
		second.description = "A second workspace in the same folder.";
		writeFileSync(
			join(root, ".ods", "zebra.json"),
			JSON.stringify(second, null, "\t"),
		);
		return root;
	}

	// A fresh window for every test: the first page a webview shows is its first
	// history entry, and a window that has shown a page of this file would only
	// navigate in place to the next.
	test.beforeEach(async () => {
		folder = twoWorkspaces();
		host = await launchVSCode({ folder });
		await resize(host, 1300, 900);
	});
	test.afterEach(async () => {
		await host.close();
		rmSync(folder, { recursive: true, force: true });
	});

	/** Opens a first page with the extension's search, and parks the reader's place before the page. */
	async function openFirst(search: string, heading: string): Promise<Frame> {
		await openPageByKeyboard(host.window, search);
		const frame = await webviewContentFrame(host.window);
		await expect(frame.locator("main h1")).toContainText(heading);
		await frame.evaluate(() => {
			(document.activeElement as HTMLElement | null)?.blur();
			window.scrollTo(0, 0);
			const h1 = document.querySelector("main h1") as HTMLElement;
			h1.focus({ preventScroll: true });
			h1.blur();
		});
		return frame;
	}

	const where = (frame: Frame): Promise<Where> =>
		frame.evaluate(() => ({
			hash: location.hash,
			heading: document.querySelector("main h1")?.textContent?.trim() ?? "",
		}));

	const ends = (frame: Frame) =>
		frame.evaluate(() => ({
			back: (
				document.querySelector('[data-action="back"]') as HTMLButtonElement
			).disabled,
			forward: (
				document.querySelector('[data-action="forward"]') as HTMLButtonElement
			).disabled,
		}));

	/** Follows, with Tab and Enter, a route link on the page that no earlier page was reached by. */
	async function follow(frame: Frame, visited: Where[]): Promise<Where> {
		const seen = new Set(visited.map((v) => v.hash || "#"));
		const hrefs = await frame.evaluate(() =>
			[
				...document.querySelectorAll('main a[href^="#/"]:not(.interactive a)'),
			].map((a) => a.getAttribute("href") as string),
		);
		const href = hrefs.find((h) => !seen.has(h));
		if (!href)
			throw new Error(
				`no new route link on the page; links: ${hrefs.join(" ")}`,
			);
		await tabToLink(host, frame, href);
		await host.window.keyboard.press("Enter");
		await expect.poll(() => frame.evaluate(() => location.hash)).toBe(href);
		await expect.poll(async () => (await active(frame)).isH1).toBe(true);
		return where(frame);
	}

	/** Activates Back or Forward the way the reader would: Shift+Tab to it and Enter or Space, or the pointer. */
	async function use(frame: Frame, action: Action, how: How) {
		if (how === "click") {
			const box = await frame
				.locator(`[data-action="${action}"]`)
				.boundingBox();
			if (!box) throw new Error(`no ${action} button box`);
			await host.window.mouse.click(
				box.x + box.width / 2,
				box.y + box.height / 2,
			);
			return;
		}
		const label = action === "back" ? "Back" : "Forward";
		const stop = await tabToLabel(host, frame, label, "Shift+Tab");
		expect(stop.tag).toBe("BUTTON");
		await host.window.keyboard.press(how === "enter" ? "Enter" : "Space");
	}

	/** The page, its heading focused, and the two buttons enabled as `disabled` says. */
	async function expectAt(
		frame: Frame,
		page: Where,
		disabled: { back: boolean; forward: boolean },
		when: string,
		focused = true,
	) {
		await expect
			.poll(() => where(frame), { message: `${when}: the page shown` })
			.toEqual(page);
		// A page the host opened leaves focus where it was; one the reader arrived at holds it.
		if (focused)
			await expect
				.poll(async () => (await active(frame)).isH1, {
					message: `${when}: the heading holds focus`,
				})
				.toBe(true);
		await expect
			.poll(() => ends(frame), { message: `${when}: the buttons` })
			.toEqual(disabled);
	}

	for (const [how, name] of [
		["enter", "Enter"],
		["space", "Space"],
		["click", "the pointer"],
	] as const) {
		test(`#77 ${name} walks Back from the third page to the first and Forward again, from the workspace`, async () => {
			const frame = await openFirst("Cross surface", "Cross surface");
			const p1 = await where(frame);
			// The folder holds two files, so the app is a reader of a set and the
			// workspace's route names its file.
			expect(p1.hash).toBe("#/workspaces/cross_surface.json");
			await expectAt(
				frame,
				p1,
				{ back: true, forward: true },
				"the first page",
				false,
			);
			const p2 = await follow(frame, [p1]);
			const p3 = await follow(frame, [p1, p2]);
			await expectAt(frame, p3, { back: false, forward: true }, "page 3");

			await use(frame, "back", how);
			await expectAt(frame, p2, { back: false, forward: false }, "back to 2");
			await use(frame, "back", how);
			// The workspace the webview first showed, not the page it shows now.
			await expectAt(frame, p1, { back: true, forward: false }, "back to 1");

			await use(frame, "forward", how);
			await expectAt(
				frame,
				p2,
				{ back: false, forward: false },
				"forward to 2",
			);
			await use(frame, "forward", how);
			await expectAt(frame, p3, { back: false, forward: true }, "forward to 3");
		});
	}

	test("#77 a first page that is not the workspace is the boundary Back cannot pass", async () => {
		const frame = await openFirst("Orders", "Orders");
		const p1 = await where(frame);
		expect(p1.hash).not.toBe("");
		await expectAt(
			frame,
			p1,
			{ back: true, forward: true },
			"the first page",
			false,
		);
		// A disabled button takes neither the pointer nor a key.
		const box = await frame.locator('[data-action="back"]').boundingBox();
		if (!box) throw new Error("no back button box");
		await host.window.mouse.click(
			box.x + box.width / 2,
			box.y + box.height / 2,
		);
		await expect.poll(() => where(frame)).toEqual(p1);
		const p2 = await follow(frame, [p1]);
		await use(frame, "back", "enter");
		await expectAt(frame, p1, { back: true, forward: false }, "back to 1");
		await host.window.mouse.click(
			box.x + box.width / 2,
			box.y + box.height / 2,
		);
		await expect.poll(() => where(frame)).toEqual(p1);
		await use(frame, "forward", "enter");
		await expectAt(frame, p2, { back: false, forward: true }, "forward to 2");
	});

	test("#77 opening a new page after going Back drops Forward", async () => {
		const frame = await openFirst("Cross surface", "Cross surface");
		const p1 = await where(frame);
		const p2 = await follow(frame, [p1]);
		const p3 = await follow(frame, [p1, p2]);
		await use(frame, "back", "enter");
		await expectAt(frame, p2, { back: false, forward: false }, "back to 2");
		const branch = await follow(frame, [p1, p2, p3]);
		expect(branch.hash).not.toBe(p3.hash);
		await expectAt(frame, branch, { back: false, forward: true }, "the branch");
		await use(frame, "back", "enter");
		await expectAt(
			frame,
			p2,
			{ back: false, forward: false },
			"back from the branch",
		);
		await use(frame, "forward", "enter");
		await expectAt(
			frame,
			branch,
			{ back: false, forward: true },
			"forward to the branch",
		);
	});

	/**
	 * Records, in the webview, every focus that lands on the page's heading and
	 * the page that was showing when it did, so a burst of pointer clicks can be
	 * checked for the arrival each valid click made. A click on a disabled button
	 * makes no arrival and records nothing.
	 */
	async function recordHeadingFocus(frame: Frame) {
		await frame.evaluate(() => {
			const w = window as unknown as {
				__arrivals?: Where[];
				__recording?: boolean;
			};
			w.__arrivals = [];
			if (w.__recording) return;
			w.__recording = true;
			document.addEventListener(
				"focusin",
				(event) => {
					const el = event.target as HTMLElement;
					if (el.matches("main h1"))
						w.__arrivals?.push({
							hash: location.hash,
							heading: el.textContent?.trim() ?? "",
						});
				},
				true,
			);
		});
	}

	const headingArrivals = (frame: Frame) =>
		frame.evaluate(
			() => (window as unknown as { __arrivals: Where[] }).__arrivals,
		);

	test("#77 a burst of clicks on Back stops at the first page", async () => {
		const frame = await openFirst("Cross surface", "Cross surface");
		const p1 = await where(frame);
		const p2 = await follow(frame, [p1]);
		const p3 = await follow(frame, [p1, p2]);
		await recordHeadingFocus(frame);
		const box = await frame.locator('[data-action="back"]').boundingBox();
		if (!box) throw new Error("no back button box");
		for (let click = 0; click < 6; click++)
			await host.window.mouse.click(
				box.x + box.width / 2,
				box.y + box.height / 2,
			);
		// Two clicks were valid and arrived, each with the heading focused; the
		// four that met a disabled Back made no navigation and no arrival. Where
		// focus rests after them is not the heading's, and is not asserted.
		await expectAt(
			frame,
			p1,
			{ back: true, forward: false },
			"after the burst",
			false,
		);
		expect(await headingArrivals(frame), "back arrivals").toEqual([p2, p1]);
		await recordHeadingFocus(frame);
		const fwd = await frame.locator('[data-action="forward"]').boundingBox();
		if (!fwd) throw new Error("no forward button box");
		for (let click = 0; click < 6; click++)
			await host.window.mouse.click(
				fwd.x + fwd.width / 2,
				fwd.y + fwd.height / 2,
			);
		await expectAt(
			frame,
			p3,
			{ back: false, forward: true },
			"after the burst forward",
			false,
		);
		expect(await headingArrivals(frame), "forward arrivals").toEqual([p2, p3]);
	});

	test("#77 a page of another file of the same folder continues the history; only another folder would start it over", async () => {
		const frame = await openFirst("Cross surface", "Cross surface");
		const first = await where(frame);
		const second = await follow(frame, [first]);
		await openPageByKeyboard(host.window, "Zebra Model");
		await expect(frame.locator("main h1")).toContainText("Zebra Model");
		const zebra = await where(frame);
		// Both files are in the one set the webview holds: another file is a page
		// of what it already shows, so Back still reaches the page the reader left.
		expect(zebra.hash).toBe("#/workspaces/zebra.json");
		await expect
			.poll(() => ends(frame))
			.toEqual({ back: false, forward: true });
		await use(frame, "back", "click");
		await expectAt(
			frame,
			second,
			{ back: false, forward: false },
			"back from the other file",
			false,
		);
		await use(frame, "forward", "click");
		await expect.poll(() => where(frame)).toEqual(zebra);
		// Its own pages are reached and left as usual.
		const inZebra = await follow(frame, [first, second, zebra]);
		await use(frame, "back", "enter");
		await expectAt(
			frame,
			zebra,
			{ back: false, forward: false },
			"back in the second file",
		);
		await use(frame, "forward", "enter");
		await expectAt(
			frame,
			inZebra,
			{ back: false, forward: true },
			"forward in the second file",
		);
	});
});
