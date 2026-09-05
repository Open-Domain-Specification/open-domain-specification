/**
 * Fitting a diagram so its panels never cover a node.
 *
 * Svelte Flow's panels float over the canvas: the legend sits top-left and
 * the options top-right. A plain `fitView` knows nothing about them, so on a
 * dense map the outermost node ends up underneath one of them. Svelte Flow
 * takes per-side padding in pixels, so the fix is to measure the panels once
 * they are on screen and reserve the strip each one occupies.
 *
 * The guarantee: the whole map is on the canvas and no node is under a panel.
 * When the room runs out, the thing that gives way is decided in one order,
 * chrome and decoration before content (`RELIEF_STEPS`):
 *
 * 1. The legend collapses to its header row, and the fit reserves that.
 * 2. The options panel collapses to its own header row.
 * 3. The air the fit keeps on a side no panel claims drops to the gutter.
 * 4. Only then the zoom floor itself gives way, from `MIN_ZOOM` to
 *    `FLOOR_ZOOM`, so the map is complete and clear even when nothing else
 *    left is worth giving.
 *
 * The order is what it costs the reader. A legend row is a term list they can
 * open again in a click; the options row is a control they were not using; the
 * air is nothing but taste. A node under a panel, or a map cropped out of the
 * canvas, is information they cannot get back, so it goes last.
 */

/** The part of a `DOMRect` this module needs; a real `DOMRect` satisfies it. */
export type Rect = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

/** Room left between a panel and the nearest node, in screen pixels. */
export const PANEL_GUTTER = 12;

/** The fraction Svelte Flow is asked for when no panel constrains a side. */
export const BASE_PADDING = 0.25;

/** The air a fit keeps once step 3 has taken it: the gutter and nothing more. */
export const NO_AIR = 0;

/**
 * No side may eat more than this much of the canvas. A panel is only ever a
 * couple of hundred pixels, but a webview split thin enough would otherwise
 * leave the fit no width to work with.
 */
const MAX_SIDE = 0.4;

/** Per-side padding in the `<number>px` form Svelte Flow's `fitView` parses. */
export type PanelPadding = {
	top: `${number}px`;
	right: `${number}px`;
	bottom: `${number}px`;
	left: `${number}px`;
};

/**
 * Svelte Flow reads a bare padding number as a fraction of the axis and turns
 * it into this many pixels per side. Mirrored here so a side with no panel on
 * it keeps exactly the room it had before.
 */
export function basePadding(size: number, fraction = BASE_PADDING): number {
	return Math.floor((size - size / (1 + fraction)) * 0.5);
}

const px = (n: number): `${number}px` => `${Math.floor(n)}px`;

/**
 * The padding that keeps `panels` off the fitted bounds inside `view`.
 *
 * A panel is cleared by reserving a whole strip of the canvas, and it can be
 * either strip it touches: the column between it and the side it hugs, or the
 * band between it and the edge above (or below) it. Both keep every node out
 * from under it, so each panel takes whichever is the smaller share of its
 * axis — the tall, narrow legend gives up a column, the wide, flat options
 * panel a band. Reserving both strips for both panels would leave a webview
 * split nothing to draw the map in. A side no panel claims keeps `fraction`
 * of air, and never less than the gutter — at `NO_AIR` the map is given
 * everything but the room it needs to keep off the edge.
 */
export function panelPadding(
	view: Rect,
	panels: Rect[],
	fraction = BASE_PADDING,
): PanelPadding {
	const width = view.right - view.left;
	const height = view.bottom - view.top;
	const air = (size: number) =>
		Math.max(basePadding(size, fraction), PANEL_GUTTER);
	const pad = {
		top: air(height),
		bottom: air(height),
		left: air(width),
		right: air(width),
	};
	/** One candidate strip: the room it costs, and what share of its axis that is. */
	const strip = (side: keyof PanelPadding, reserve: number, of: number) => ({
		side,
		reserve,
		of,
		cost: reserve / of,
	});
	for (const panel of panels) {
		const across =
			(panel.left + panel.right) / 2 < (view.left + view.right) / 2
				? strip("left", panel.right - view.left, width)
				: strip("right", view.right - panel.left, width);
		const down =
			(panel.top + panel.bottom) / 2 < (view.top + view.bottom) / 2
				? strip("top", panel.bottom - view.top, height)
				: strip("bottom", view.bottom - panel.top, height);
		const cheaper = across.cost <= down.cost ? across : down;
		pad[cheaper.side] = Math.max(
			pad[cheaper.side],
			Math.min(cheaper.reserve + PANEL_GUTTER, cheaper.of * MAX_SIDE),
		);
	}
	return {
		top: px(pad.top),
		bottom: px(pad.bottom),
		left: px(pad.left),
		right: px(pad.right),
	};
}

/**
 * The classes the two floating panels are found by. They are declared here
 * and imported by the panels themselves, so a rename cannot quietly leave the
 * fit measuring nothing — the style blocks still spell them out, since Svelte
 * takes no variable in a `:global(...)` selector.
 */
export const LEGEND_PANEL_CLASS = "diagram-legend";
export const OPTIONS_PANEL_CLASS = "diagram-options";

/** The panels a fit has to stay clear of, in the order they are measured. */
export const PANEL_SELECTOR = `.${LEGEND_PANEL_CLASS}, .${OPTIONS_PANEL_CLASS}`;

/**
 * Measures the diagram's own box and its panels. An element with no layout
 * yet — jsdom, or a container detached before the frame lands — measures as a
 * zero box, which `panelPadding` reads as no claim at all.
 */
export function measurePanels(container: Element): {
	view: Rect;
	panels: Rect[];
} {
	return {
		view: container.getBoundingClientRect(),
		panels: [...container.querySelectorAll(PANEL_SELECTOR)].map((el) =>
			el.getBoundingClientRect(),
		),
	};
}

/** The slice of the Svelte Flow instance this module drives. */
export type Fitter = {
	fitView: (options: { padding: PanelPadding }) => unknown;
};

/**
 * Refits `flow` inside `container` with the panels' strips reserved. Does
 * nothing without a container: there is then nothing to measure, and the
 * initial `fitView` Svelte Flow does itself still stands.
 */
export function fitPastPanels(
	flow: Fitter,
	container: Element | undefined | null,
	fraction = BASE_PADDING,
): void {
	if (!container) return;
	const { view, panels } = measurePanels(container);
	flow.fitView({ padding: panelPadding(view, panels, fraction) });
}

/**
 * The floor a fitted map should keep: below this a bounded context is a smudge
 * with a smear of text on it, which is not a map anyone reads.
 */
export const MIN_ZOOM = 0.2;

/**
 * The floor of last resort, once every step of relief has been taken and the
 * map still does not clear `MIN_ZOOM`. Cards 20 and 56 dropped the only floor
 * there was to this number, which made every crowded map unreadable to save
 * the worst one; here it is the fourth thing to give way rather than the
 * first, and it is what keeps the guarantee true — the whole map, no node
 * under a panel — for a map no canvas can hold at a readable size.
 */
export const FLOOR_ZOOM = 0.1;

/**
 * The zoom below which the fit stops asking the map to shrink and starts
 * asking the chrome to get out of the way: a tenth above `MIN_ZOOM`. A map
 * fitted exactly at the floor is one the viewport is already clamping, so the
 * chrome has to be out of the way before the map reaches the wall rather than
 * once it is pressed against it — but only just before. Further above the
 * floor and the panels close on maps that were perfectly readable: at a
 * quarter, the middle two reference workspaces both lost their legend and
 * their options panel at editor size, which is a rule helping nobody.
 */
export const READABLE_ZOOM = 0.22;

/** What the fit gives up, in the order it gives it. */
export const RELIEF_STEPS = ["legend", "options", "air", "floor"] as const;

/** One step of that order. */
export type ReliefStep = (typeof RELIEF_STEPS)[number];

/** The box the graph's nodes span, in flow coordinates. */
export type Size = { width: number; height: number };

/**
 * The zoom Svelte Flow would fit `bounds` at inside `view` with `padding`
 * reserved, before any clamping: the smaller of the two axes' ratios, as
 * `getViewportForBounds` computes it. A graph with no size is nothing to fit,
 * so it reports infinity — no pressure on anything.
 */
export function fittedZoom(
	view: Rect,
	padding: PanelPadding,
	bounds: Size,
): number {
	if (bounds.width <= 0 || bounds.height <= 0) return Number.POSITIVE_INFINITY;
	const reserved = (side: keyof PanelPadding) =>
		Number.parseFloat(padding[side]);
	const width = view.right - view.left - reserved("left") - reserved("right");
	const height = view.bottom - view.top - reserved("top") - reserved("bottom");
	return Math.min(width / bounds.width, height / bounds.height);
}

/**
 * Whether the fit has to take another step of relief: with the strips
 * `panels` claim inside `view` reserved and `fraction` of air kept, `bounds`
 * would fit below `floor`.
 *
 * Pure, so the whole order is testable without a browser — hand it the
 * numbers a webview would have measured at each step and it answers. The
 * caller asks it once per step, measuring again in between, because a
 * collapsed panel is a smaller box and that smaller box is what the next
 * question is about.
 */
export function needsRelief(
	view: Rect,
	panels: Rect[],
	bounds: Size,
	fraction = BASE_PADDING,
	floor = READABLE_ZOOM,
): boolean {
	return fittedZoom(view, panelPadding(view, panels, fraction), bounds) < floor;
}

/** The slice of the Svelte Flow instance the decision measures the graph with. */
export type Measurer<TNode> = {
	getNodes: () => TNode[];
	getNodesBounds: (nodes: TNode[]) => Size;
};

/**
 * The same question asked of a live diagram: the container gives the view and
 * the panels as they are now, the flow gives the bounds. Without a container
 * nothing has been measured and nothing has to give way.
 */
export function crowded<TNode>(
	flow: Measurer<TNode>,
	container: Element | undefined | null,
	fraction = BASE_PADDING,
	floor = READABLE_ZOOM,
): boolean {
	if (!container) return false;
	const { view, panels } = measurePanels(container);
	return needsRelief(
		view,
		panels,
		flow.getNodesBounds(flow.getNodes()),
		fraction,
		floor,
	);
}
