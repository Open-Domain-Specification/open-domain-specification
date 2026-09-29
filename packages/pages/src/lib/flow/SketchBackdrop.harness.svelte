<script lang="ts">
import { type Node, SvelteFlow } from "@xyflow/svelte";
import "@xyflow/svelte/dist/style.css";
import SketchBackdrop from "./SketchBackdrop.svelte";

/** The backdrop only draws inside a flow; a small canvas of context-like nodes shows it. */
let {
	nodes: initial,
	groupLabels,
	padding = undefined,
}: {
	nodes: Node[];
	groupLabels: Map<string, string>;
	padding?: number;
} = $props();
// svelte-ignore state_referenced_locally
// The stories must name this harness as their `component`: a meta-level `render` gets
// no args, and `initial` then stays undefined. `bind:nodes` on SvelteFlow can't accept
// `undefined` since `nodes` has a fallback value there, so the raw array starts as a list.
let nodes = $state.raw<Node[]>(initial ?? []);
// Sync from a re-render's `initial`, without undoing a drag done through `bind:nodes` below.
$effect(() => {
	if (initial) nodes = initial;
});
</script>

<div style="height: 320px">
	<SvelteFlow bind:nodes fitView>
		<SketchBackdrop {nodes} {groupLabels} {padding} />
	</SvelteFlow>
</div>
