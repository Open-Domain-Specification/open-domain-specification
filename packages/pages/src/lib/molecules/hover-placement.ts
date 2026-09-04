/**
 * Where a hover card goes, in viewport coordinates, given the word it hangs
 * from and its own size. It is the editor hover widget's rule: under the
 * word, its left edge on the word's, kept inside the viewport by a small
 * margin. Near the right edge it shifts left rather than flipping sideways,
 * so the card stays anchored where the eye went; with no room below and more
 * above it opens above the word; when neither side has room it takes the
 * larger side and scrolls inside itself.
 */

export type Rect = { top: number; left: number; bottom: number; right: number };
export type Size = { width: number; height: number };
export type Placement = {
	top: number;
	left: number;
	/** Set only when the card is taller than the room it was given. */
	maxHeight?: number;
};

/** Distance kept from every viewport edge, as the editor's hover keeps. */
export const MARGIN = 8;

export function placeHover(anchor: Rect, card: Size, viewport: Size): Placement {
	const below = viewport.height - MARGIN - anchor.bottom;
	const above = anchor.top - MARGIN;
	const opensAbove = card.height > below && above > below;
	const room = opensAbove ? above : below;
	const height = Math.min(card.height, Math.max(room, 0));
	const top = opensAbove ? anchor.top - height : anchor.bottom;
	const left = Math.max(
		MARGIN,
		Math.min(anchor.left, viewport.width - MARGIN - card.width),
	);
	return card.height > room && room > 0
		? { top, left, maxHeight: room }
		: { top, left };
}
