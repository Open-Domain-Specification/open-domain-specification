import { expect, type Locator } from "@playwright/test";

/**
 * What a diagram's fit looks like once it has settled, measured in the
 * browser from rendered boxes rather than from the fit's own arithmetic.
 *
 * A fit lands in stages: Svelte Flow's own fit when the nodes are measured,
 * then the panel-aware refit a few frames later, then one per panel the fit
 * collapses, and a refit whenever the canvas or a panel changes size. A read
 * taken between them can pass on a frame the reader never keeps. So
 * `settledFit` waits, in the page, until the viewport's transform, every
 * node's box, every panel's box and the canvas's own size have been the same
 * for `STILL_FRAMES` frames running, and only then measures. It fails rather
 * than measure if they never hold still.
 */

export type Box = { left: number; top: number; right: number; bottom: number };

export type SettledFit = {
	/** The canvas: Svelte Flow's own box. */
	view: Box;
	/** Every node on the canvas, cluster boxes included. */
	nodes: { id: string; box: Box }[];
	/** The union of the nodes' boxes: the graph as drawn. */
	graph: Box;
	/** The floating panels, by name, as they are on screen. */
	panels: Record<Panel, Box>;
	/** The viewport's scale. */
	zoom: number;
	/** The step of relief the fit took, from the diagram's `data-fit`. */
	step: string;
	/** Frames waited for the fit to hold still. */
	frames: number;
};

export type Panel = "legend" | "options" | "controls" | "minimap";

/** The four panels the guarantee keeps clear, by the classes they are drawn with. */
export const PANELS: Record<Panel, string> = {
	legend: ".diagram-legend",
	options: ".diagram-options",
	controls: ".svelte-flow__controls",
	minimap: ".svelte-flow__minimap",
};

/** The gutter the fit keeps between the graph and an edge or a panel (`PANEL_GUTTER`). */
export const GUTTER = 12;

/** Svelte Flow's zoom ceiling, which the diagram never overrides. */
const MAX_ZOOM = 2;

/** How long the fit must hold still before it counts as settled. */
const STILL_FRAMES = 12;

/** Measures the settled fit of the `.svelte-flow` canvas `flow`. */
export async function settledFit(flow: Locator): Promise<SettledFit> {
	const measured = await flow.evaluate(
		(el, { panels, still }) =>
			new Promise<SettledFit | string>((done) => {
				const box = (e: Element): Box => {
					const r = e.getBoundingClientRect();
					return {
						left: r.left,
						top: r.top,
						right: r.right,
						bottom: r.bottom,
					};
				};
				const viewport = el.querySelector(
					".svelte-flow__viewport",
				) as HTMLElement;
				const sign = () =>
					[
						viewport.style.transform,
						el.clientWidth,
						el.clientHeight,
						...[...el.querySelectorAll(".svelte-flow__node")].map((n) =>
							Object.values(box(n)).join(),
						),
						...Object.values(panels).map((s) => {
							const p = el.querySelector(s);
							return p ? Object.values(box(p)).join() : "none";
						}),
					].join("|");
				let last = sign();
				let same = 0;
				let frames = 0;
				const tick = () => {
					const now = sign();
					same = now === last ? same + 1 : 0;
					last = now;
					frames += 1;
					if (same < still && frames < 600) {
						requestAnimationFrame(tick);
						return;
					}
					if (same < still) {
						done(`the fit never held still for ${still} frames in ${frames}`);
						return;
					}
					const nodes = [
						...el.querySelectorAll<HTMLElement>(".svelte-flow__node"),
					].map((n) => ({ id: n.dataset.id ?? "", box: box(n) }));
					const graph = nodes.reduce<Box>(
						(u, { box: b }) => ({
							left: Math.min(u.left, b.left),
							top: Math.min(u.top, b.top),
							right: Math.max(u.right, b.right),
							bottom: Math.max(u.bottom, b.bottom),
						}),
						{
							left: Number.POSITIVE_INFINITY,
							top: Number.POSITIVE_INFINITY,
							right: Number.NEGATIVE_INFINITY,
							bottom: Number.NEGATIVE_INFINITY,
						},
					);
					const found = Object.fromEntries(
						Object.entries(panels).map(([name, s]) => {
							const p = el.querySelector(s);
							if (!p) throw new Error(`no ${name} panel`);
							return [name, box(p)];
						}),
					) as Record<Panel, Box>;
					done({
						view: box(el),
						nodes,
						graph,
						panels: found,
						zoom: Number(
							/scale\(([^)]+)\)/.exec(viewport.style.transform)?.[1] ?? 0,
						),
						step: el.closest(".interactive")?.getAttribute("data-fit") ?? "",
						frames,
					});
				};
				requestAnimationFrame(tick);
			}),
		{ panels: PANELS, still: STILL_FRAMES },
	);
	if (typeof measured === "string") throw new Error(measured);
	return measured;
}

/** A box's width and height: what a canvas is, wherever the page has scrolled it. */
export const sizeOf = (b: Box) => ({
	width: b.right - b.left,
	height: b.bottom - b.top,
});

const overlaps = (a: Box, b: Box) =>
	a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;

/** The nodes a panel covers, as `node<panel`, for a failure message that names them. */
export function covered(fit: SettledFit): string[] {
	return fit.nodes.flatMap(({ id, box }) =>
		(Object.keys(fit.panels) as Panel[])
			.filter((name) => overlaps(box, fit.panels[name]))
			.map((name) => `${id}<${name}`),
	);
}

/** The nodes drawn past the edge of the canvas. */
export function outside(fit: SettledFit): string[] {
	const v = fit.view;
	return fit.nodes
		.filter(
			({ box: b }) =>
				b.left < v.left - 0.5 ||
				b.top < v.top - 0.5 ||
				b.right > v.right + 0.5 ||
				b.bottom > v.bottom + 0.5,
		)
		.map(({ id }) => id);
}

/**
 * The guarantee: the whole map is on the canvas and no node is under a panel.
 * `where` names the case, and the message carries the step the fit took.
 */
export function expectClear(fit: SettledFit, where: string): void {
	expect(covered(fit), `nodes under a panel, ${where} (${fit.step})`).toEqual(
		[],
	);
	expect(outside(fit), `nodes off the canvas, ${where} (${fit.step})`).toEqual(
		[],
	);
}

/**
 * How far the graph stops short of what bounds it, side by side: the canvas's
 * edge, or the facing edge of a panel the graph would run into by growing
 * that way — one beside it, overlapping it across the other axis once the
 * gutter is counted. A panel the graph clears by passing above or below it
 * does not bound it sideways, and the other way round.
 */
export function gaps(fit: SettledFit): Box {
	const { view: v, graph: g } = fit;
	const reach = GUTTER - 2;
	const panels = Object.values(fit.panels);
	const acrossRows = panels.filter(
		(p) => p.top < g.bottom + reach && g.top - reach < p.bottom,
	);
	const acrossColumns = panels.filter(
		(p) => p.left < g.right + reach && g.left - reach < p.right,
	);
	const nearest = (from: number, edges: number[], sign: 1 | -1) =>
		Math.min(...edges.map((e) => (from - e) * sign).filter((d) => d >= -0.5));
	return {
		left: nearest(g.left, [v.left, ...acrossRows.map((p) => p.right)], 1),
		right: nearest(g.right, [v.right, ...acrossRows.map((p) => p.left)], -1),
		top: nearest(g.top, [v.top, ...acrossColumns.map((p) => p.bottom)], 1),
		bottom: nearest(
			g.bottom,
			[v.bottom, ...acrossColumns.map((p) => p.top)],
			-1,
		),
	};
}

/**
 * The fit fills the canvas it is given: along the axis that binds it, the
 * graph reaches the gutter on both sides, so nothing but the gutter is left
 * between it and the canvas's edge or the panel it clears. The other axis
 * then has room to spare, which is the graph's shape, not the fit's.
 */
export function expectFilled(fit: SettledFit, where: string): void {
	// A small graph at Svelte Flow's zoom ceiling is as large as it will draw,
	// with room to spare on both axes: there is nothing more to fill.
	if (fit.zoom >= MAX_ZOOM) return;
	const g = gaps(fit);
	const tight = (a: number, b: number) =>
		Math.max(a, b) <= GUTTER + 1.5 && Math.min(a, b) >= GUTTER - 1.5;
	expect(
		tight(g.left, g.right) || tight(g.top, g.bottom),
		`the graph stops short of the canvas it was given, ${where}: gaps ${JSON.stringify(
			Object.fromEntries(Object.entries(g).map(([k, n]) => [k, Math.round(n)])),
		)}, zoom ${fit.zoom.toFixed(3)} (${fit.step})`,
	).toBe(true);
}
