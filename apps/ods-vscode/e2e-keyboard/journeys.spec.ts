import { expect, type Frame, type Page, test } from "@playwright/test";
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
			inToc: !!el?.closest("nav.toc"),
			isH1: el?.matches("main h1") ?? false,
			tabindex: el?.getAttribute("tabindex") ?? null,
		};
	});

type Stop = Awaited<ReturnType<typeof active>>;

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

/** The distinct transforms of the diagram viewport over `ms`, sampled per frame while `act` runs. */
async function viewportSteps(
	frame: Frame,
	ms: number,
	act: () => Promise<void>,
): Promise<string[]> {
	const sampled = frame.evaluate(
		(duration) =>
			new Promise<string[]>((resolve) => {
				const viewport = document.querySelector(
					".svelte-flow__viewport",
				) as HTMLElement;
				const seen: string[] = [];
				const start = performance.now();
				const tick = () => {
					const now = viewport.style.transform;
					if (seen[seen.length - 1] !== now) seen.push(now);
					if (performance.now() - start < duration) requestAnimationFrame(tick);
					else resolve(seen);
				};
				tick();
			}),
		ms,
	);
	await act();
	return sampled;
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

		// Tab from the top of the page into the diagram, then through it.
		await pressUntil(host, frame, (s) => s.inFlow, "the diagram");
		const stops = [await active(frame)];
		for (let i = 0; i < 40; i++) {
			await host.window.keyboard.press("Tab");
			const now = await active(frame);
			if (!now.inFlow) break;
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
			(await viewportSteps(frame, 700, () => dblclickPane(host.window, frame)))
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
		const fit = await viewportSteps(frame, 500, () =>
			host.window.keyboard.press("Enter"),
		);
		expect(fit.length).toBeLessThanOrEqual(2);
		// A double click still zooms, and lands at once.
		await frame.evaluate(() => {
			(document.activeElement as HTMLElement | null)?.blur();
		});
		const steps = await viewportSteps(frame, 700, () =>
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
