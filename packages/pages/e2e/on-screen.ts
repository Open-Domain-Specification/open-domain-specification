import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Asserts that an element is PAINTED where a reader can see it, which
 * `toBeVisible()` does not: that reads the box and the computed style, so an
 * element pushed off the window by a transformed ancestor, or clipped away by
 * an ancestor's overflow, still passes it. This asks the browser what is at
 * the element's own pixels: its box lies inside the viewport, and
 * `document.elementFromPoint` at its centre and just inside its top-left
 * corner answers with the element or one of its descendants, so nothing
 * covers it and nothing clips it.
 */
export type OnScreen = {
	box: { left: number; top: number; right: number; bottom: number };
	viewport: { width: number; height: number };
	inside: boolean;
	centre: string | null;
	corner: string | null;
	painted: boolean;
};

/** Measures, in the frame the locator lives in, where the element is and what is painted there. */
export async function measureOnScreen(locator: Locator): Promise<OnScreen> {
	return locator.evaluate((el) => {
		const b = el.getBoundingClientRect();
		const width = document.documentElement.clientWidth;
		const height = document.documentElement.clientHeight;
		const owns = (hit: Element | null) => hit !== null && el.contains(hit);
		const at = (x: number, y: number) => document.elementFromPoint(x, y);
		const centre = at(b.left + b.width / 2, b.top + b.height / 2);
		const corner = at(b.left + 2, b.top + 2);
		const inside =
			b.width > 0 &&
			b.height > 0 &&
			b.left >= 0 &&
			b.top >= 0 &&
			b.right <= width &&
			b.bottom <= height;
		const label = (hit: Element | null) =>
			hit === null ? null : `${hit.tagName.toLowerCase()}.${hit.className}`;
		return {
			box: { left: b.left, top: b.top, right: b.right, bottom: b.bottom },
			viewport: { width, height },
			inside,
			centre: label(centre),
			corner: label(corner),
			painted: owns(centre) && owns(corner),
		};
	});
}

export async function onScreen(locator: Locator, when = "on screen") {
	const seen = await measureOnScreen(locator);
	expect(
		seen.inside,
		`${when}: box inside the viewport ${JSON.stringify(seen)}`,
	).toBe(true);
	expect(
		seen.painted,
		`${when}: painted, not covered or clipped ${JSON.stringify(seen)}`,
	).toBe(true);
}

/**
 * Waits until scrolling and layout have stopped: the explanation's scroll
 * position and box and the focused element's box are unchanged for six frames
 * running, after a short idle. A scroll the browser makes to reveal a focused
 * element, and whatever the page then does about it, lands after the key
 * press that caused it, so a read in the same callback sees neither.
 */
export async function settle(page: Page): Promise<void> {
	await page.waitForTimeout(150);
	await page.evaluate(
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

export type Citation = {
	focused: boolean;
	scrollTop: number;
	maxScroll: number;
	layer: { top: number; bottom: number };
	citation: { top: number; bottom: number };
	inside: boolean;
	hitIsCitation: boolean;
};

/** Where the focused element inside the explanation is, against the explanation's box, and what is painted at its centre. */
export async function measureCitation(page: Page): Promise<Citation> {
	return page.evaluate(() => {
		const layer = document.querySelector(".layer") as HTMLElement;
		const cit = document.activeElement as HTMLElement;
		const l = layer.getBoundingClientRect();
		const c = cit.getBoundingClientRect();
		// A link that wraps is one box over several lines, and the middle of that
		// box can be another line's text: hit-test the middle of its last line.
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
			// A pixel of slack: the browser's reveal rounds to device pixels.
			inside: c.top >= l.top - 1 && c.bottom <= l.bottom + 1,
			hitIsCitation: hit !== null && cit.contains(hit),
		};
	});
}
