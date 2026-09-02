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
let nodes = $state.raw<Node[]>(initial);
</script>

<div style="height: 320px">
	<SvelteFlow bind:nodes fitView>
		<SketchBackdrop {nodes} {groupLabels} {padding} />
	</SvelteFlow>
</div>
