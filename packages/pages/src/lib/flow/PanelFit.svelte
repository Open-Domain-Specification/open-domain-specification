<script lang="ts">
import { useSvelteFlow } from "@xyflow/svelte";
import { onMount, tick } from "svelte";
import { type DiagramFit, refit } from "./fit.svelte";
import { crowded, MIN_ZOOM, PANEL_SELECTOR, RELIEF_STEPS } from "./panel-fit";

/**
 * Draws nothing: it exists to refit the canvas from inside Svelte Flow, with
 * the room the floating panels take reserved. Svelte Flow's own initial fit
 * runs as soon as the nodes are measured and knows nothing about the panels,
 * so this one lands after it — a tick for the nodes to be laid out, then two
 * frames, by which time every panel has a box to measure. A diagram torn down
 * before then is left alone.
 *
 * When the room runs out it walks the order in `panel-fit.ts`: the legend
 * gives way, then the options panel, and only if the map still will not clear
 * `MIN_ZOOM` does the floor itself. Each step is followed by a
 * tick and a frame, so the box the next question is asked about is the
 * collapsed one, and each is taken only if the map still needs it. The
 * questions are asked with the panels at the size they are then, never twice
 * about the same box, so nothing can open, run out of room and close again in
 * front of the reader.
 *
 * After that, a panel that changes size — the reader opening the legend, or
 * closing the options — refits the map round its new box, as long as the view
 * is still the one the fit drew. Only the fit is redone, never the walk, so a
 * panel the reader opened stays open. Once the reader has zoomed or panned,
 * the view is theirs and a panel opening over it moves nothing.
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
	const resized = new ResizeObserver(() => {
		if (live && fit.owns(flow.getViewport())) void refit(fit, flow, container);
	});
	void (async () => {
		await tick();
		// The parent binds `container` as it mounts, after this component's own
		// mount has run, so the panels are looked for once the tick has landed.
		for (const panel of container?.querySelectorAll(PANEL_SELECTOR) ?? [])
			resized.observe(panel);
		await frame();
		await frame();
		for (const step of RELIEF_STEPS) {
			// The panels give way to reach the readable floor; the last step is
			// the floor giving way, so it is asked about `MIN_ZOOM` itself.
			const floor = step === "floor" ? MIN_ZOOM : undefined;
			if (!live || !crowded(flow, container, floor)) break;
			fit.give(step);
			await settle();
		}
		if (live) await refit(fit, flow, container);
	})();
	return () => {
		live = false;
		resized.disconnect();
	};
});
</script>
