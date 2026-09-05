<script lang="ts">
import { useSvelteFlow } from "@xyflow/svelte";
import { onMount, tick } from "svelte";
import type { LegendState } from "./legend-state.svelte";
import { fitPastPanels, legendCrowded } from "./panel-fit";

/**
 * Draws nothing: it exists to refit the canvas once, from inside Svelte Flow,
 * with the room the floating panels take reserved. Svelte Flow's own initial
 * fit runs as soon as the nodes are measured and knows nothing about the
 * legend or the options panel, so this one lands after it — a tick for the
 * nodes to be laid out, then two frames, by which time both panels have a box
 * to measure. A diagram torn down before then is left alone.
 *
 * The legend is asked first. If reserving its column would fit the map below
 * the readable floor it gives way, and a frame later it is a single row: the
 * fit then measures that row and reserves only it. The question is asked once,
 * with the legend at its full height, because that is the only moment its
 * column can be measured — asking again once it is a row would find room,
 * open it, run out of room and close it.
 */
let { container, legend }: { container?: HTMLElement; legend: LegendState } =
	$props();
const flow = useSvelteFlow();
const frame = () =>
	new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
onMount(() => {
	let live = true;
	void (async () => {
		await tick();
		await frame();
		await frame();
		if (live && legendCrowded(flow, container)) {
			legend.crowd();
			await tick();
			await frame();
		}
		if (live) fitPastPanels(flow, container);
	})();
	return () => {
		live = false;
	};
});
</script>
