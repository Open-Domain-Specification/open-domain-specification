/**
 * Fitting a diagram so its panels never cover a node.
 *
 * Svelte Flow's panels float over the canvas: the legend sits top-left, the
 * options top-right, the zoom controls bottom-left and the minimap
 * bottom-right. A plain `fitView` knows nothing about them, so on a dense map
 * the outermost node ends up underneath one of them. Svelte Flow takes
 * per-side padding in pixels, so the fix is to measure the panels once they
 * are on screen and reserve the strip each one occupies.
 *
 * The guarantee: the whole map is on the canvas and no node is under a panel.
 * When the room runs out, the thing that gives way is decided in one order,
 * chrome and decoration before content (`RELIEF_STEPS`):
 *
 * 1. The legend collapses to its header row, and the fit reserves that.
 * 2. The options panel collapses to its own header row.
 * 3. Only then the zoom floor itself gives way, from `MIN_ZOOM` to
 *    `FLOOR_ZOOM`, so the map is complete and clear even when nothing else
 *    left is worth giving.
 *
 * The order is what it costs the reader. A legend row is a term list they can
 * open again in a click; the options row is a control they were not using. A
 * node under a panel, or a map cropped out of the canvas, is information they
 * cannot get back, so it goes last. The controls and the minimap never give
 * way: they are small, and they are how a reader moves round a map the fit has
 * made small. There is no air to give: a side no panel claims keeps the
 * gutter and nothing more, so the graph reaches the canvas it is given.
 */

/** The part of a `DOMRect` this module needs; a real `DOMRect` satisfies it. */
export type Rect = {
	left: number;
	right: number;
	top: number;
	bottom: number;
};

/**
 * Room left between the graph and a panel, or the canvas's edge, in screen
 * pixels: the only inset a fit keeps.
 */
export const PANEL_GUTTER = 12;

/**
 * The most of the canvas a panel's strip should take. A panel is only ever a
 * couple of hundred pixels, but a webview split thin enough would otherwise
 * leave the fit no width to work with, so a panel that needs more is asked
 * to give way instead (`needsRelief`).
 */
const MAX_SIDE = 0.4;

/** Per-side padding in the `<number>px` form Svelte Flow's `fitView` parses. */
export type PanelPadding = {
	top: `${number}px`;
	right: `${number}px`;
	bottom: `${number}px`;
	left: `${number}px`;
};

const px = (n: number): `${number}px` => `${Math.floor(n)}px`;

/** One side of the canvas, as Svelte Flow's per-side padding names it. */
type Side = keyof PanelPadding;

/** A strip of the canvas reserved to clear one panel: its side and its depth in pixels. */
type Strip = { side: Side; reserve: number };

/** The two strips beside `panel`, the cheaper as a share of its axis first, before any cap. */
function stripsBeside(view: Rect, panel: Rect) {
	const width = view.right - view.left;
	const height = view.bottom - view.top;
	const strip = (side: Side, depth: number, of: number) => ({
		side,
		reserve: depth + PANEL_GUTTER,
		of,
		cost: depth / of,
	});
	const across =
		(panel.left + panel.right) / 2 < (view.left + view.right) / 2
			? strip("left", panel.right - view.left, width)
			: strip("right", view.right - panel.left, width);
	const down =
		(panel.top + panel.bottom) / 2 < (view.top + view.bottom) / 2
			? strip("top", panel.bottom - view.top, height)
			: strip("bottom", view.bottom - panel.top, height);
	return across.cost <= down.cost ? [across, down] : [down, across];
}

/**
 * Whether `panel` can be cleared by a strip no deeper than `MAX_SIDE` of its
 * axis. One that cannot is crowding the canvas however the map is fitted, so
 * the fit asks it to give way (`needsRelief`) before drawing round it.
 */
export function clearsWithinCap(view: Rect, panel: Rect): boolean {
	// A box with no layout yet is no claim at all, as `measurePanels` says.
	const area = (r: Rect) => (r.right - r.left) * (r.bottom - r.top);
	if (!area(view) || !area(panel)) return true;
	return stripsBeside(view, panel).some((s) => s.reserve <= s.of * MAX_SIDE);
}

/**
 * The strips that can clear `panel`: the column between it and the side it
 * hugs, and the band between it and the edge above (or below) it, each with
 * the gutter added. Either keeps every node out from under it, the cheaper
 * one — as a share of its axis — listed first. Strips within `MAX_SIDE` of
 * their axis are offered when there are any. A panel neither of those clears,
 * one the reader opened on a canvas too small for it, is offered both strips
 * past the cap: a node under a panel is the one thing the fit never trades.
 * `panelPadding` takes one only if the map keeps room beside it.
 */
function stripsFor(view: Rect, panel: Rect): Strip[] {
	const both = stripsBeside(view, panel);
	const within = both.filter((s) => s.reserve <= s.of * MAX_SIDE);
	return within.length ? within : both;
}

/** The cheaper strip beside `panel`, no deeper than the cap: the last resort. */
function cutToCap(view: Rect, panel: Rect): Strip {
	const [cheaper] = stripsBeside(view, panel);
	return {
		side: cheaper.side,
		reserve: Math.min(cheaper.reserve, cheaper.of * MAX_SIDE),
	};
}

/**
 * The padding that keeps `panels` off the fitted bounds inside `view`.
 *
 * Each panel is cleared by one of its strips (`stripsFor`); reserving both
 * for every panel would leave a webview split nothing to draw the map in.
 * Which one is worth taking depends on the map: a wide, flat graph is held by
 * the width, so a band off the top or bottom costs it nothing, while a column
 * costs it scale. So every combination of choices is tried, and the one that
 * lets `bounds` fit at the largest zoom wins. With no size to fit — or when
 * nothing does better — each panel takes its cheaper strip, the tall, narrow
 * legend a column and the wide, flat options panel a band. A side no panel
 * claims keeps the gutter and nothing more.
 */
export function panelPadding(
	view: Rect,
	panels: Rect[],
	bounds: Size = { width: 0, height: 0 },
): PanelPadding {
	const padded = (choice: Strip[]): PanelPadding => {
		const pad = {
			top: PANEL_GUTTER,
			bottom: PANEL_GUTTER,
			left: PANEL_GUTTER,
			right: PANEL_GUTTER,
		};
		for (const { side, reserve } of choice)
			pad[side] = Math.max(pad[side], reserve);
		return {
			top: px(pad.top),
			bottom: px(pad.bottom),
			left: px(pad.left),
			right: px(pad.right),
		};
	};
	const width = view.right - view.left;
	const height = view.bottom - view.top;
	/** Leaves the map at least what two capped strips would, on both axes. */
	const roomy = (padding: PanelPadding) => {
		const reserved = (side: Side) => Number.parseFloat(padding[side]);
		const room = 1 - 2 * MAX_SIDE;
		return (
			width - reserved("left") - reserved("right") >= width * room &&
			height - reserved("top") - reserved("bottom") >= height * room
		);
	};
	// Every way of choosing one strip per panel; the first is each panel's
	// cheaper strip, and another replaces it only by fitting strictly larger.
	// Strips past the cap can together leave the map nothing, so a choice has
	// to leave it room; if none does, every panel takes its cheaper strip cut
	// to the cap.
	const choices = panels
		.map((panel) => stripsFor(view, panel))
		.reduce<Strip[][]>(
			(all, strips) =>
				all.flatMap((choice) => strips.map((s) => [...choice, s])),
			[[]],
		)
		.map(padded)
		.filter(roomy);
	const [first, ...rest] = choices.length
		? choices
		: [padded(panels.map((panel) => cutToCap(view, panel)))];
	let best = first;
	let zoom = fittedZoom(view, best, bounds);
	for (const candidate of rest) {
		const next = fittedZoom(view, candidate, bounds);
		if (next > zoom) {
			best = candidate;
			zoom = next;
		}
	}
	return best;
}

/**
 * The classes the two floating panels are found by. They are declared here
 * and imported by the panels themselves, so a rename cannot quietly leave the
 * fit measuring nothing — the style blocks still spell them out, since Svelte
 * takes no variable in a `:global(...)` selector.
 */
export const LEGEND_PANEL_CLASS = "diagram-legend";
export const OPTIONS_PANEL_CLASS = "diagram-options";

/**
 * Svelte Flow's own two panels, found by the classes the library gives them:
 * the zoom controls and the minimap.
 */
const LIBRARY_PANEL_CLASSES = ["svelte-flow__controls", "svelte-flow__minimap"];

/** The panels a fit has to stay clear of, in the order they are measured. */
export const PANEL_SELECTOR = [
	LEGEND_PANEL_CLASS,
	OPTIONS_PANEL_CLASS,
	...LIBRARY_PANEL_CLASSES,
]
	.map((name) => `.${name}`)
	.join(", ");

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
export type Fitter<TNode extends Shown> = Measurer<TNode> & {
	fitView: (options: { padding: PanelPadding }) => Promise<boolean>;
};

/**
 * Refits `flow` inside `container` with the panels' strips reserved, and
 * settles once Svelte Flow has drawn the fit. Does nothing without a
 * container: there is then nothing to measure, and the initial `fitView`
 * Svelte Flow does itself still stands.
 */
export async function fitPastPanels<TNode extends Shown>(
	flow: Fitter<TNode>,
	container: Element | undefined | null,
): Promise<void> {
	if (!container) return;
	const { view, panels } = measurePanels(container);
	const bounds = drawnBounds(flow);
	await flow.fitView({ padding: panelPadding(view, panels, bounds) });
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
 * the worst one; here it is the last thing to give way rather than the
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
 * their options panel at editor size, which is a rule helping nobody. That
 * was measured while the fit still kept a tenth of each axis as air; without
 * it (#89) maps land higher, so the floor is if anything more cautious now,
 * and it is left where it was.
 */
export const READABLE_ZOOM = 0.22;

/** What the fit gives up, in the order it gives it. */
export const RELIEF_STEPS = ["legend", "options", "floor"] as const;

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
 * Whether the fit has to take another step of relief: a panel no strip
 * within the cap can clear, or, with the strips `panels` claim inside `view`
 * reserved, `bounds` fitting below `floor`.
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
	floor = READABLE_ZOOM,
): boolean {
	return (
		!panels.every((panel) => clearsWithinCap(view, panel)) ||
		fittedZoom(view, panelPadding(view, panels, bounds), bounds) < floor
	);
}

/** What the fit reads off a node: which one it is, and whether it is drawn at all. */
export type Shown = { id: string; hidden?: boolean };

/** The slice of the Svelte Flow instance the decision measures the graph with. */
export type Measurer<TNode extends Shown> = {
	getNodes: () => TNode[];
	getNodesBounds: (nodes: TNode[]) => Size;
};

/**
 * The box of the nodes Svelte Flow fits: the ones it draws. A hidden node —
 * a cluster in the sketch style, where the backdrop is drawn instead — is left
 * out of `fitView`, so it is left out of every question asked about that fit.
 */
export function drawnBounds<TNode extends Shown>(flow: Measurer<TNode>): Size {
	return flow.getNodesBounds(flow.getNodes().filter((node) => !node.hidden));
}

/**
 * The same question asked of a live diagram: the container gives the view and
 * the panels as they are now, the flow gives the bounds. Without a container
 * nothing has been measured and nothing has to give way.
 */
export function crowded<TNode extends Shown>(
	flow: Measurer<TNode>,
	container: Element | undefined | null,
	floor = READABLE_ZOOM,
): boolean {
	if (!container) return false;
	const { view, panels } = measurePanels(container);
	return needsRelief(view, panels, drawnBounds(flow), floor);
}
