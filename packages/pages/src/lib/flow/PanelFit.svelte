<script lang="ts">
import { useSvelteFlow } from "@xyflow/svelte";
import { onMount, tick } from "svelte";
import { fitPastPanels } from "./panel-fit";

/**
 * Draws nothing: it exists to refit the canvas once, from inside Svelte Flow,
 * with the room the floating panels take reserved. Svelte Flow's own initial
 * fit runs as soon as the nodes are measured and knows nothing about the
 * legend or the options panel, so this one lands after it — a tick for the
 * nodes to be laid out, then two frames, by which time both panels have a box
 * to measure. A diagram torn down before then is left alone.
 */
let { container }: { container?: HTMLElement } = $props();
const flow = useSvelteFlow();
const frame = () =>
	new Promise<void>((resolve) => requestAnimationFrame(() => resolve()));
onMount(() => {
	let live = true;
	void (async () => {
		await tick();
		await frame();
		await frame();
		if (live) fitPastPanels(flow, container);
	})();
	return () => {
		live = false;
	};
});
</script>
