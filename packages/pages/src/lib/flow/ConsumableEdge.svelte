<script lang="ts">
import {
	BaseEdge,
	type EdgeProps,
	Position,
	useInternalNode,
} from "@xyflow/svelte";
import {
	type EdgeEndpoints,
	edgePath,
	padEndpoints,
	portCentre,
} from "./edge-path";
import { anchorTowards, rectOf } from "./floating";
import { diagramOptions } from "./options.svelte";
import PortBadge from "./PortBadge.svelte";
import { roleLabel } from "./roles";

/**
 * A consumption: from the consumer to the slot on the provider that offers
 * the consumable, arrowhead at the provider. The consumable name sits on the
 * edge; the consumer's protection pattern is a port at its end. The provider
 * end lands on the slot's own handle, named by `targetHandleId`, which shows
 * the provider's pattern itself; only when that handle is not measured does
 * the edge draw a port for it. With floating handles the consumer end slides
 * to face the provider.
 */
let {
	id,
	source,
	target,
	label,
	markerEnd,
	style,
	sourceX,
	sourceY,
	sourcePosition,
	targetX,
	targetY,
	targetPosition,
	targetHandleId,
	data,
}: EdgeProps & { data?: { sourceLabel?: string; targetLabel?: string } } =
	$props();
// An edge's ends never change once created, so the initial ids are the ids.
// svelte-ignore state_referenced_locally
const sourceNode = useInternalNode(source);
// svelte-ignore state_referenced_locally
const targetNode = useInternalNode(target);

/** Centre of the target slot's handle in flow coordinates, once measured. */
const slotPoint = $derived.by(() => {
	const t = targetNode.current;
	if (!t) return undefined;
	const h = t.internals.handleBounds?.target?.find(
		(h) => h.id === targetHandleId,
	);
	if (!h) return undefined;
	const at = t.internals.positionAbsolute;
	return { x: at.x + h.x + h.width / 2, y: at.y + h.y + h.height / 2 };
});

const params: EdgeEndpoints = $derived.by(() => {
	const s = sourceNode.current;
	const t = targetNode.current;
	const end = slotPoint
		? { ...slotPoint, position: Position.Left }
		: { x: targetX, y: targetY, position: targetPosition };
	// Floating, the consumer end faces the provider as a whole, so every consumption
	// of one provider leaves from the same point and their ports coincide.
	const start =
		diagramOptions.handles === "floating" && s
			? anchorTowards(
					rectOf(s),
					t ? rectOf(t) : { ...end, width: 0, height: 0 },
				)
			: { x: sourceX, y: sourceY, position: sourcePosition };
	const to =
		t && !slotPoint && diagramOptions.handles === "floating" && s
			? anchorTowards(rectOf(t), rectOf(s))
			: end;
	return {
		sourceX: start.x,
		sourceY: start.y,
		sourcePosition: start.position,
		targetX: to.x,
		targetY: to.y,
		targetPosition: to.position,
	};
});

const sourcePort = $derived(roleLabel(data?.sourceLabel));
/** The slot handle is the provider's port; without one the edge draws it. */
const targetPort = $derived(
	slotPoint ? undefined : roleLabel(data?.targetLabel),
);
const path = $derived(
	edgePath(
		padEndpoints(params, {
			source: !!sourcePort,
			target: !!slotPoint || !!targetPort,
		}),
	),
);
</script>

<BaseEdge {id} path={path[0]} {markerEnd} {style} />
{#if label}
	<text class="edge-label" x={path[1]} y={path[2]} text-anchor="middle" dominant-baseline="middle">{label}</text>
{/if}
{#if sourcePort && data?.sourceLabel}
	{@const at = portCentre(params.sourceX, params.sourceY, params.sourcePosition)}
	<PortBadge class="end consumer" x={at.x} y={at.y} label={sourcePort} title={data.sourceLabel} />
{/if}
{#if targetPort && data?.targetLabel}
	{@const at = portCentre(params.targetX, params.targetY, params.targetPosition)}
	<PortBadge class="end provider" x={at.x} y={at.y} label={targetPort} title={data.targetLabel} />
{/if}
