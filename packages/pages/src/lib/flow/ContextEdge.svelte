<script lang="ts">
import { BaseEdge, type EdgeProps, useInternalNode } from "@xyflow/svelte";
import { edgeEndpoints, edgePath, padEndpoints, portCentre } from "./edge-path";
import PortBadge from "./PortBadge.svelte";
import { roleTitle } from "./roles";

/**
 * A context-map relationship: the stereotype (U/D, C/S, P, SK, SW) at the
 * middle, the upstream roles (OHS, PL) as a port at the source end and the
 * downstream ones (CF, ACL) as a port at the target end. Implied edges arrive
 * dashed and symmetric types without an arrowhead; the ends follow the handle
 * and edge-style options.
 */
let {
	id,
	source,
	target,
	label,
	markerEnd,
	style,
	data,
	...ends
}: EdgeProps & { data?: { sourceLabel?: string; targetLabel?: string } } =
	$props();
// An edge's ends never change once created, so the initial ids are the ids.
// svelte-ignore state_referenced_locally
const sourceNode = useInternalNode(source);
// svelte-ignore state_referenced_locally
const targetNode = useInternalNode(target);

/** Symmetric stereotypes keep the Graphviz colours; everything else uses the theme stroke. */
const COLORS: Record<string, string> = { SK: "#8d6e63", SW: "#9e9e9e" };

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

// The adapter always sets the stereotype label; unknown ones simply have no colour.
const stroke = $derived(COLORS[String(label)]);
const edgeStyle = $derived(
	[style, stroke && `stroke: ${stroke}`].filter(Boolean).join("; ") ||
		undefined,
);
</script>

{#if params && path}
	<BaseEdge {id} path={path[0]} {markerEnd} style={edgeStyle} class="context-edge" />
	{#if label}
		<text class="edge-label stereotype" x={path[1]} y={path[2]} text-anchor="middle" dominant-baseline="middle">{label}</text>
	{/if}
	{#if data?.sourceLabel}
		{@const at = portCentre(params.sourceX, params.sourceY, params.sourcePosition)}
		<PortBadge class="role upstream" x={at.x} y={at.y} label={data.sourceLabel} title={roleTitle(data.sourceLabel)} />
	{/if}
	{#if data?.targetLabel}
		{@const at = portCentre(params.targetX, params.targetY, params.targetPosition)}
		<PortBadge class="role downstream" x={at.x} y={at.y} label={data.targetLabel} title={roleTitle(data.targetLabel)} />
	{/if}
{/if}
