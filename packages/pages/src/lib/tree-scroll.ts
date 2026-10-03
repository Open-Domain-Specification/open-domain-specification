/**
 * Keeping the reader's place in the site tree in view.
 *
 * The tree is longer than the window, so the row the reader is on can sit
 * below the fold of the sidebar. These helpers move the sidebar's own scroll
 * container, and only that: `Element.scrollIntoView` would also scroll every
 * ancestor, including the document, and the page being read must not move
 * because the tree did.
 */

/** The row to keep in view: the page's own link, else the deepest row on the way to it. */
export function currentRow(tree: HTMLElement): HTMLElement | null {
	const own = tree.querySelector<HTMLElement>('a[aria-current="page"]');
	const onTheWay = tree.querySelectorAll<HTMLElement>(".item.active");
	// Rows on the path nest, so document order runs from the outermost to the deepest.
	return (
		own?.closest<HTMLElement>(".item") ?? onTheWay.item(onTheWay.length - 1)
	);
}

/** The nearest ancestor that scrolls vertically, or null when the tree sits in the page's own flow. */
export function scrollContainer(el: HTMLElement): HTMLElement | null {
	for (let up = el.parentElement; up; up = up.parentElement) {
		const { overflowY } = getComputedStyle(up);
		if (overflowY === "auto" || overflowY === "scroll") return up;
	}
	return null;
}

/**
 * Scrolls `container` by the least that brings `row` fully inside its visible
 * box, as `block: "nearest"` would: a row already inside moves nothing.
 */
export function revealRow(
	container: HTMLElement,
	row: HTMLElement,
	behavior: ScrollBehavior,
): void {
	const box = container.getBoundingClientRect();
	const top = box.top + container.clientTop;
	const bottom = top + container.clientHeight;
	const at = row.getBoundingClientRect();
	const by = at.top < top ? at.top - top : Math.max(0, at.bottom - bottom);
	if (by === 0) return;
	container.scrollTo({ top: container.scrollTop + by, behavior });
}
