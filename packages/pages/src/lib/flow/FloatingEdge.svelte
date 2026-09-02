<script lang="ts">
import {
	BaseEdge,
	type EdgeProps,
	getBezierPath,
	getSmoothStepPath,
	getStraightPath,
	useInternalNode,
} from "@xyflow/svelte";
import { floatingEdgeParams, rectOf } from "./floating";
import { diagramOptions } from "./options.svelte";

/**
 * An edge that attaches wherever the two nodes face each other, instead of
 * at fixed left and right handles. The edge style follows the diagram options.
 */
let { id, source, target, label, markerEnd, style }: EdgeProps = $props();
// An edge's ends never change once created, so the initial ids are the ids.
// svelte-ignore state_referenced_locally
const sourceNode = useInternalNode(source);
// svelte-ignore state_referenced_locally
const targetNode = useInternalNode(target);

const rects = $derived.by(() => {
	const s = sourceNode.current;
	const t = targetNode.current;
	return s && t ? { source: rectOf(s), target: rectOf(t) } : undefined;
});

const path = $derived.by(() => {
	if (!rects) return undefined;
	const params = floatingEdgeParams(rects.source, rects.target);
	switch (diagramOptions.edges) {
		case "straight":
			return getStraightPath(params);
		case "step":
			return getSmoothStepPath({ ...params, borderRadius: 0 });
		case "smoothstep":
			return getSmoothStepPath(params);
		default:
			return getBezierPath(params);
	}
});
</script>

{#if path}
	<BaseEdge {id} path={path[0]} {markerEnd} {style} />
	{#if label}
		<text class="edge-label" x={path[1]} y={path[2]} text-anchor="middle" dominant-baseline="middle">{label}</text>
	{/if}
{/if}

<style>
	.edge-label {
		font-size: 11px;
		fill: var(--fg);
		paint-order: stroke;
		stroke: var(--card);
		stroke-width: 4px;
		stroke-linejoin: round;
		pointer-events: none;
	}
</style>
