<script lang="ts">
import { useSvelteFlow } from "@xyflow/svelte";
import { onMount, tick } from "svelte";
import type { DiagramFit } from "./fit.svelte";
import { crowded, fitPastPanels, MIN_ZOOM, RELIEF_STEPS } from "./panel-fit";

/**
 * Draws nothing: it exists to refit the canvas once, from inside Svelte Flow,
 * with the room the floating panels take reserved. Svelte Flow's own initial
 * fit runs as soon as the nodes are measured and knows nothing about the
 * legend or the options panel, so this one lands after it — a tick for the
 * nodes to be laid out, then two frames, by which time both panels have a box
 * to measure. A diagram torn down before then is left alone.
 *
 * When the room runs out it walks the order in `panel-fit.ts`: the legend
 * gives way, then the options panel, then the air, and only if the map still
 * will not clear `MIN_ZOOM` does the floor itself. Each step is followed by a
 * tick and a frame, so the box the next question is asked about is the
 * collapsed one, and each is taken only if the map still needs it. The
 * questions are asked with the panels at the size they are then, never twice
 * about the same box, so nothing can open, run out of room and close again in
 * front of the reader.
 */
let { container, fit }: { container?: HTMLElement; fit: DiagramFit } = $props();
const flow = useSvelteFlow();
const frame = () =>
	new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
onMount(() => {
	let live = true;
	/** Lets a collapsed panel land and be measured before the next question. */
	const settle = async () => {
		await tick();
		await frame();
	};
	void (async () => {
		await tick();
		await frame();
		await frame();
		for (const step of RELIEF_STEPS) {
			// The first three steps chase the readable floor; the fourth is the
			// floor giving way, so it is asked about `MIN_ZOOM` itself.
			const floor = step === "floor" ? MIN_ZOOM : undefined;
			if (!live || !crowded(flow, container, fit.air, floor)) break;
			fit.give(step);
			await settle();
		}
		if (live) fitPastPanels(flow, container, fit.air);
	})();
	return () => {
		live = false;
	};
});
</script>
