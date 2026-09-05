<script lang="ts">
import { BaseEdge, type EdgeProps, useInternalNode } from "@xyflow/svelte";
import { edgeEndpoints, edgePath } from "./edge-path";

/**
 * A step of the reaction chain: a plain arrow from what happens to what
 * happens next. The one edge that is not a step — a process to the fact that
 * completes an instance — arrives dashed (the class `flowEdges` puts on it)
 * and labelled `ends`, because a dash alone cannot say which of the three
 * things a dashed line means across these diagrams a reader is looking at.
 *
 * The ends follow the handle and edge-style options like every other edge;
 * the map draws no ports, so neither end is padded.
 */
let { id, label, markerEnd, style, source, target, ...ends }: EdgeProps =
	$props();
// An edge's ends never change once created, so the initial ids are the ids.
// svelte-ignore state_referenced_locally
const sourceNode = useInternalNode(source);
// svelte-ignore state_referenced_locally
const targetNode = useInternalNode(target);

const params = $derived(
	edgeEndpoints(ends, sourceNode.current, targetNode.current),
);
const path = $derived(params && edgePath(params));
</script>

{#if path}
	<BaseEdge {id} path={path[0]} {markerEnd} {style} class="flow-edge" />
	{#if label}
		<text class="edge-label" x={path[1]} y={path[2]} text-anchor="middle" dominant-baseline="middle">{label}</text>
	{/if}
{/if}
