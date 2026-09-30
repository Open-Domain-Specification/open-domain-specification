import { expect, type Locator } from "@playwright/test";

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
