<script module lang="ts">
import type { Disposition } from "@open-domain-specification/core";

/** What an evidence-aware context edge needs beyond the shipped edge's data. */
export type DispositionEdgeData = {
	sourceLabel?: string;
	targetLabel?: string;
	disposition?: Disposition;
	/** One-line hover text for both badges, appended to the role names. */
	summary?: string;
	onBadgeClick?: (at: { x: number; y: number }) => void;
};
</script>

<script lang="ts">
import { BaseEdge, EdgeLabel, type EdgeProps, useInternalNode } from "@xyflow/svelte";
import {
	edgeEndpoints,
	edgePath,
	padEndpoints,
	portCentre,
} from "../flow/edge-path";
import { roleTitle } from "../flow/roles";

/**
 * The context-map edge of RFC-002 section 4.2: the shipped edge plus the
 * disposition marks on its role badges. A badge whose intent is marked
 * refactor takes the warning colour, a tolerated one is outlined instead of
 * filled, and a by-design one is left exactly as it is today. Clicking a
 * badge reports its flow coordinates so the disclosure card can be anchored
 * to it inside the diagram.
 *
 * This is a Storybook variant, not the shipped `ContextEdge`: it draws its
 * badges as its own edge labels rather than through `PortBadge` because the
 * shipped badge is deliberately `pointer-events: none` and carries no click
 * handler.
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
}: EdgeProps & { data?: DispositionEdgeData } = $props();
// An edge's ends never change once created, so the initial ids are the ids.
// svelte-ignore state_referenced_locally
const sourceNode = useInternalNode(source);
// svelte-ignore state_referenced_locally
const targetNode = useInternalNode(target);

// TODO: clean-code - 0.6 - DRY: the endpoint, path, colour and style
// derivation below is `flow/ContextEdge.svelte:14-51` verbatim; only the badge
// rendering differs. Extracting it into `flow/edge-path.ts` would mean editing
// a shipped module, which card 19 forbids. Card F should either fold the
// disposition marks into the shipped edge or share the geometry helper.
/** Symmetric stereotypes keep the Graphviz colours, as the shipped edge does. */
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
const stroke = $derived(COLORS[String(label)]);
const edgeStyle = $derived(
	[style, stroke && `stroke: ${stroke}`].filter(Boolean).join("; ") ||
		undefined,
);
const mark = $derived(
	data?.disposition && data.disposition !== "by-design" ? data.disposition : "",
);
const titleFor = (text: string) =>
	[roleTitle(text), data?.summary].filter(Boolean).join("\n");
</script>

{#if params && path}
	<BaseEdge {id} path={path[0]} {markerEnd} style={edgeStyle} class="context-edge" />
	{#if label}
		<text class="edge-label stereotype" x={path[1]} y={path[2]} text-anchor="middle" dominant-baseline="middle">{label}</text>
	{/if}
	{#each [["upstream", data?.sourceLabel], ["downstream", data?.targetLabel]] as const as [side, text] (side)}
		{#if text}
			{@const at = side === "upstream"
				? portCentre(params.sourceX, params.sourceY, params.sourcePosition)
				: portCentre(params.targetX, params.targetY, params.targetPosition)}
			<EdgeLabel
				x={at.x}
				y={at.y}
				class={`port role ${side} disposition-badge ${mark}`}
				title={titleFor(text)}
				data-x={at.x}
				data-y={at.y}
			>
				<button
					type="button"
					class="port-label"
					aria-label={`Evidence for ${titleFor(text)}`}
					onclick={() => data?.onBadgeClick?.(at)}
				>{text}</button>
			</EdgeLabel>
		{/if}
	{/each}
{/if}

<style>
	/* The badge is rendered by <EdgeLabel> into the edge-label layer, outside
	   this component's scope, so its marks have to be global. */
	:global(.svelte-flow .svelte-flow__edge-label.disposition-badge) {
		pointer-events: all;
	}
	:global(.svelte-flow .svelte-flow__edge-label.disposition-badge.tolerated) {
		background: transparent;
	}
	:global(.svelte-flow .svelte-flow__edge-label.disposition-badge.refactor) {
		border-color: var(--warn);
		color: var(--warn);
	}
	:global(.svelte-flow .svelte-flow__edge-label.disposition-badge button) {
		font: inherit;
		color: inherit;
		background: none;
		border: 0;
		padding: 0;
		cursor: pointer;
	}
</style>
