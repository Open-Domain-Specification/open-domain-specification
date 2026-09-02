<script lang="ts">
import { BaseEdge, type EdgeProps, useInternalNode } from "@xyflow/svelte";
import { edgeEndpoints, edgePath, padEndpoints, portCentre } from "./edge-path";
import PortBadge from "./PortBadge.svelte";

/**
 * A UML connector for one entity relation, picked by the edge `type`:
 * `relation-includes` is a composition (filled diamond on the whole),
 * `relation-references` a navigable association (open arrow) and
 * `relation-uses` a dependency (dashed, open arrow). The core expresses no
 * aggregation, so there is no hollow diamond. The role label sits at the
 * midpoint and the multiplicities are ports at the ends: the cardinality at
 * the target, as in the Graphviz image, and "1" at the whole of a
 * composition. Ends follow the diagram options: fixed handles or floating
 * anchors.
 */
let {
	id,
	type,
	source,
	target,
	label,
	data,
	...ends
}: EdgeProps & { data?: { sourceLabel?: string; targetLabel?: string } } =
	$props();
// An edge's ends never change once created, so the initial ids are the ids.
// svelte-ignore state_referenced_locally
const sourceNode = useInternalNode(source);
// svelte-ignore state_referenced_locally
const targetNode = useInternalNode(target);

const relation = $derived(type.replace(/^relation-/, ""));
const dashed = $derived(relation === "uses");
const diamond = $derived(relation === "includes");

const params = $derived(
	edgeEndpoints(ends, sourceNode.current, targetNode.current),
);
const path = $derived(
	params &&
		edgePath(
			padEndpoints(params, {
				source: !!data?.sourceLabel,
				target: !!data?.targetLabel,
			}),
		),
);
</script>

{#if params && path}
	<defs>
		<!-- Sized in stroke widths, so both markers scale with the edge stroke. -->
		<marker id={`${id}-diamond`} viewBox="0 0 14 8" refX="14" refY="4" markerWidth="9" markerHeight="5" markerUnits="strokeWidth" orient="auto-start-reverse">
			<path d="M0,4 L7,0 L14,4 L7,8 Z" class="marker-fill" />
		</marker>
		<marker id={`${id}-vee`} viewBox="0 0 10 10" refX="10" refY="5" markerWidth="6" markerHeight="6" markerUnits="strokeWidth" orient="auto">
			<path d="M0,0 L10,5 L0,10" class="marker-stroke" />
		</marker>
	</defs>
	<BaseEdge
		{id}
		path={path[0]}
		class={`relation-edge ${relation}`}
		style={`stroke: var(--fg); stroke-opacity: 0.7;${dashed ? " stroke-dasharray: 6 4;" : ""}`}
		markerStart={diamond ? `url(#${id}-diamond)` : undefined}
		markerEnd={diamond ? undefined : `url(#${id}-vee)`}
	/>
	{#if label}
		<text class="edge-label" x={path[1]} y={path[2]} text-anchor="middle" dominant-baseline="middle">{label}</text>
	{/if}
	{#if data?.sourceLabel}
		{@const at = portCentre(params.sourceX, params.sourceY, params.sourcePosition)}
		<PortBadge class="cardinality source" x={at.x} y={at.y} label={data.sourceLabel} />
	{/if}
	{#if data?.targetLabel}
		{@const at = portCentre(params.targetX, params.targetY, params.targetPosition)}
		<PortBadge class="cardinality target" x={at.x} y={at.y} label={data.targetLabel} />
	{/if}
{/if}

<style>
	.marker-fill { fill: var(--fg); stroke: none; }
	.marker-stroke { fill: none; stroke: var(--fg); stroke-width: 1px; }
</style>
