/**
 * Fitting a diagram so its panels never cover a node.
 *
 * Svelte Flow's panels float over the canvas: the legend sits top-left and
 * the options top-right. A plain `fitView` knows nothing about them, so on a
 * dense map the outermost node ends up underneath one of them. Svelte Flow
 * takes per-side padding in pixels, so the fix is to measure the panels once
 * they are on screen and reserve the column each one occupies.
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
 * split nothing to draw the map in. A side no panel claims keeps the default
 * fraction.
 */
export function panelPadding(
	view: Rect,
	panels: Rect[],
	fraction = BASE_PADDING,
): PanelPadding {
	const width = view.right - view.left;
	const height = view.bottom - view.top;
	const pad = {
		top: basePadding(height, fraction),
		bottom: basePadding(height, fraction),
		left: basePadding(width, fraction),
		right: basePadding(width, fraction),
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
): void {
	if (!container) return;
	const { view, panels } = measurePanels(container);
	flow.fitView({ padding: panelPadding(view, panels) });
}

/**
 * How far Svelte Flow may pull a map out before it stops. Cards 20 and 56
 * dropped this to 0.1 so NorthBank's fifteen contexts could fit beside an
 * expanded legend in a narrow webview; at that scale a context is a smudge,
 * which is not a map anyone can read. It is back at 0.2, and the legend gives
 * way instead.
 */
export const MIN_ZOOM = 0.2;

/**
 * The readable floor: the zoom below which the fit stops asking the map to
 * shrink and asks the legend to get out of the way instead. It sits a notch
 * above `MIN_ZOOM` on purpose — a map fitted exactly at the floor is one the
 * viewport is already clamping, so the legend gives way before the map
 * reaches the wall, not once it is pressed against it.
 */
export const READABLE_ZOOM = 0.25;

/** The box the graph's nodes span, in flow coordinates. */
export type Size = { width: number; height: number };

/**
 * The zoom Svelte Flow would fit `bounds` at inside `view` with `padding`
 * reserved, before any clamping: the smaller of the two axes' ratios, as
 * `getViewportForBounds` computes it. A graph with no size is nothing to fit,
 * so it reports infinity — no pressure on the legend at all.
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
 * Whether the legend has to give way: reserving the strips `panels` claim
 * inside `view` would fit `bounds` below the readable floor. Pure, so the
 * decision is testable without a browser — give it the numbers a webview
 * would have measured and it answers.
 */
export function legendGivesWay(
	view: Rect,
	panels: Rect[],
	bounds: Size,
	floor = READABLE_ZOOM,
): boolean {
	return fittedZoom(view, panelPadding(view, panels), bounds) < floor;
}

/** The slice of the Svelte Flow instance the decision measures the graph with. */
export type Measurer<TNode> = {
	getNodes: () => TNode[];
	getNodesBounds: (nodes: TNode[]) => Size;
};

/**
 * The same decision taken from a live diagram: the container gives the view
 * and the panels, the flow gives the bounds. Without a container nothing has
 * been measured and nothing has to give way.
 */
export function legendCrowded<TNode>(
	flow: Measurer<TNode>,
	container: Element | undefined | null,
	floor = READABLE_ZOOM,
): boolean {
	if (!container) return false;
	const { view, panels } = measurePanels(container);
	return legendGivesWay(
		view,
		panels,
		flow.getNodesBounds(flow.getNodes()),
		floor,
	);
}
