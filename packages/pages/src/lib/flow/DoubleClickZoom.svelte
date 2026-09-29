<script lang="ts">
import { useSvelteFlow } from "@xyflow/svelte";
import { zoomedAt } from "./double-click-zoom";

/**
 * Draws nothing: while motion is reduced it gives the pane's double click back
 * to the reader, immediately. The library's own double-click zoom is an eased
 * transition that a caller cannot shorten, so `InteractiveDiagram` switches it
 * off under reduced motion and this puts the gesture back without the easing:
 * the same step, around the pointer, set with no duration. It follows the
 * setting while the page is open.
 */
let {
	container,
	reduced,
	minZoom,
	maxZoom,
}: {
	container?: HTMLElement;
	reduced: boolean;
	minZoom: number;
	maxZoom: number;
} = $props();
const flow = useSvelteFlow();

$effect(() => {
	if (!reduced || !container) return;
	const box = container;
	const onDblclick = (event: MouseEvent) => {
		// The pane only: a node opens its page and a control is its own.
		if (!(event.target as Element).classList.contains("svelte-flow__pane"))
			return;
		const at = box.getBoundingClientRect();
		void flow.setViewport(
			zoomedAt(
				flow.getViewport(),
				{ x: event.clientX - at.left, y: event.clientY - at.top },
				{ min: minZoom, max: maxZoom },
				event.shiftKey,
			),
			{ duration: 0 },
		);
	};
	box.addEventListener("dblclick", onDblclick);
	return () => box.removeEventListener("dblclick", onDblclick);
});
</script>
