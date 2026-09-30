/**
 * One diagram's fit: the two panels it floats, the air it keeps, the zoom
 * floor in force, how far down the order of relief it had to go, and whether
 * the view on screen is still the one it drew.
 *
 * The order itself is `RELIEF_STEPS` in `panel-fit.ts` and the decision to
 * take another step is `needsRelief` there; this is the single place that
 * says what each step does. `PanelFit.svelte` walks the order, measuring
 * again after each step, and the page reads `step` to say which one was taken.
 */
import type { Viewport } from "@xyflow/svelte";
import {
	BASE_PADDING,
	type Fitter,
	FLOOR_ZOOM,
	fitPastPanels,
	MIN_ZOOM,
	NO_AIR,
	type ReliefStep,
} from "./panel-fit";
import { createPanelState, type PanelState } from "./panel-state.svelte";

export type DiagramFit = {
	/** The legend, top left. */
	readonly legend: PanelState;
	/** The options panel, top right. */
	readonly options: PanelState;
	/** The air kept on a side no panel claims, as a fraction of the axis. */
	readonly air: number;
	/** The floor the canvas clamps to: `MIN_ZOOM` until step four. */
	readonly minZoom: number;
	/** The last step taken, or `none` while the map fits as it is. */
	readonly step: ReliefStep | "none";
	/** Takes a step: the order is the caller's, the effect is here. */
	give(step: ReliefStep): void;
	/** Records the view a fit has just drawn. */
	landed(view: Viewport): void;
	/**
	 * Whether `now` is still the view the fit last drew, so a change in the
	 * room it was drawn for may draw it again. Before the first fit lands
	 * there is nothing to redraw; once the reader zooms or pans, the view is
	 * theirs and nothing the fit does moves it.
	 */
	owns(now: Viewport): boolean;
};

export function createDiagramFit(): DiagramFit {
	const legend = createPanelState("legend");
	const options = createPanelState("options");
	let air = $state(BASE_PADDING);
	let minZoom = $state(MIN_ZOOM);
	let step = $state<ReliefStep | "none">("none");
	let drawn: Viewport | undefined;
	return {
		legend,
		options,
		get air() {
			return air;
		},
		get minZoom() {
			return minZoom;
		},
		get step() {
			return step;
		},
		give(next) {
			step = next;
			if (next === "legend") legend.crowd();
			else if (next === "options") options.crowd();
			else if (next === "air") air = NO_AIR;
			else minZoom = FLOOR_ZOOM;
		},
		landed(view) {
			drawn = { ...view };
		},
		owns(now) {
			return (
				drawn !== undefined &&
				now.x === drawn.x &&
				now.y === drawn.y &&
				now.zoom === drawn.zoom
			);
		},
	};
}

/**
 * Fits `flow` past the panels in `container` and records the view it drew as
 * the fit's own. Every fit after the first goes through here — a panel
 * changing size, the Fit View control — so each one hands the view back to
 * the fit.
 */
export async function refit<TNode>(
	fit: DiagramFit,
	flow: Fitter<TNode> & { getViewport: () => Viewport },
	container: Element | undefined | null,
): Promise<void> {
	await fitPastPanels(flow, container, fit.air);
	fit.landed(flow.getViewport());
}
