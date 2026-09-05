/**
 * One diagram's fit: the two panels it floats, the air it keeps, the zoom
 * floor in force, and how far down the order of relief it had to go.
 *
 * The order itself is `RELIEF_STEPS` in `panel-fit.ts` and the decision to
 * take another step is `needsRelief` there; this is the single place that
 * says what each step does. `PanelFit.svelte` walks the order, measuring
 * again after each step, and the page reads `step` to say which one was taken.
 */
import {
	BASE_PADDING,
	FLOOR_ZOOM,
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
};

export function createDiagramFit(): DiagramFit {
	const legend = createPanelState("legend");
	const options = createPanelState("options");
	let air = $state(BASE_PADDING);
	let minZoom = $state(MIN_ZOOM);
	let step = $state<ReliefStep | "none">("none");
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
	};
}
