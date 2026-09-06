<script lang="ts">
import { BaseEdge, type EdgeProps, useInternalNode } from "@xyflow/svelte";
import { edgeEndpoints, edgePath, padEndpoints, portCentre } from "./edge-path";
import type { ContextEdgeData } from "./flow-nodes";
import PortBadge from "./PortBadge.svelte";
import { roleTitle } from "./roles";

/**
 * A context-map relationship: the stereotype (U/D, C/S, P, SK, SW) at the
 * middle, the upstream roles (OHS, PL) as a port at the source end and the
 * downstream ones (CF, ACL) as a port at the target end. Implied edges arrive
 * dashed and symmetric types without an arrowhead; the ends follow the handle
 * and edge-style options.
 *
 * All three are badges, so all three can carry the evidence layer (RFC-002
 * section 4.2): a refactor intent takes the warning colour, a tolerated one is
 * outlined instead of filled, a by-design one is unchanged, each hovers to the
 * pattern's meaning and what is known, and each click reports its flow
 * coordinates so the disclosure card can be anchored to it. A symmetric
 * relationship has no role badges, which is why the stereotype is a badge
 * too — otherwise a shared kernel could never be marked.
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
}: EdgeProps & { data?: ContextEdgeData } = $props();
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
// One pair may hold two agreements in one direction — a negotiated API and a
// tolerated feed — and each is its own line, so the stereotype badge carries
// the agreement's name beside the code that tells them apart. The colour still
// keys off the stereotype alone (decision 15, card 103).
const stereotype = $derived(
	data?.name ? `${String(label)} · ${data.name}` : String(label),
);
/** The stereotype badge hovers to the agreement's name, then to what is known. */
const stereotypeTitle = $derived(
	[data?.name, data?.summary].filter(Boolean).join("\n") || undefined,
);
const edgeStyle = $derived(
	[style, stroke && `stroke: ${stroke}`].filter(Boolean).join("; ") ||
		undefined,
);
/** By-design is the unmarked default, so only the other two name a class. */
const mark = $derived(
	data?.disposition && data.disposition !== "by-design" ? data.disposition : "",
);
/** A role badge hovers to its pattern names, then to what is known about the intent. */
const titleFor = (text: string) =>
	[roleTitle(text), data?.summary].filter(Boolean).join("\n");
</script>

{#if params && path}
	<BaseEdge {id} path={path[0]} {markerEnd} style={edgeStyle} class="context-edge" />
	{#if label}
		<PortBadge class="stereotype" x={path[1]} y={path[2]} label={stereotype} title={stereotypeTitle} {mark} onclick={data?.onBadgeClick} />
	{/if}
	{#if data?.sourceLabel}
		{@const at = portCentre(params.sourceX, params.sourceY, params.sourcePosition)}
		<PortBadge class="role upstream" x={at.x} y={at.y} label={data.sourceLabel} title={titleFor(data.sourceLabel)} {mark} onclick={data.onBadgeClick} />
	{/if}
	{#if data?.targetLabel}
		{@const at = portCentre(params.targetX, params.targetY, params.targetPosition)}
		<PortBadge class="role downstream" x={at.x} y={at.y} label={data.targetLabel} title={titleFor(data.targetLabel)} {mark} onclick={data.onBadgeClick} />
	{/if}
{/if}
