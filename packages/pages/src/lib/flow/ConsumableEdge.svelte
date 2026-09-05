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
	handlePoint,
	padEndpoints,
	portCentre,
} from "./edge-path";
import { anchorTowards, rectOf } from "./floating";
import { diagramOptions } from "./options.svelte";
import PortBadge from "./PortBadge.svelte";
import { roleLabel } from "./roles";

/**
 * An assembly connector: from the consumer's socket to the lollipop on the
 * provider that offers the consumable, no arrowhead, the consumable name on
 * the line. Both ends are handles the components draw themselves, named by
 * `sourceHandleId` and `targetHandleId`, and each shows its own pattern;
 * only when a handle is not measured does the edge fall back to the fixed
 * end and draw a port badge for that pattern. With floating handles a
 * fallback consumer end slides to face the provider.
 */
let {
	id,
	source,
	target,
	label,
	style,
	sourceX,
	sourceY,
	sourcePosition,
	targetX,
	targetY,
	targetPosition,
	sourceHandleId,
	targetHandleId,
	data,
}: EdgeProps & {
	data?: { sourceLabel?: string; targetLabel?: string; by?: string[] };
} = $props();
// An edge's ends never change once created, so the initial ids are the ids.
// svelte-ignore state_referenced_locally
const sourceNode = useInternalNode(source);
// svelte-ignore state_referenced_locally
const targetNode = useInternalNode(target);

/** Centre of the provider's lollipop, once measured. */
const slotPoint = $derived(
	handlePoint(targetNode.current, "target", targetHandleId),
);
/** Centre of the consumer's socket, once measured. */
const socketPoint = $derived(
	handlePoint(sourceNode.current, "source", sourceHandleId),
);

const params: EdgeEndpoints = $derived.by(() => {
	const s = sourceNode.current;
	const t = targetNode.current;
	const floating = diagramOptions.handles === "floating";
	const end = slotPoint
		? { ...slotPoint, position: Position.Left }
		: { x: targetX, y: targetY, position: targetPosition };
	// Floating, a fallback consumer end faces the provider as a whole, so every consumption
	// of one provider leaves from the same point and their ports coincide.
	const start = socketPoint
		? { ...socketPoint, position: Position.Right }
		: floating && s
			? anchorTowards(
					rectOf(s),
					t ? rectOf(t) : { ...end, width: 0, height: 0 },
				)
			: { x: sourceX, y: sourceY, position: sourcePosition };
	const to =
		t && !slotPoint && floating && s
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

/** The consumer's operations or policies behind the consumption, for the hover. */
const madeBy = $derived(
	data?.by?.length ? `Made by ${data.by.join(", ")}` : undefined,
);

/** The socket is the consumer's port; without one the edge draws it. */
const sourcePort = $derived(
	socketPoint ? undefined : roleLabel(data?.sourceLabel),
);
/** The lollipop is the provider's port; without one the edge draws it. */
const targetPort = $derived(
	slotPoint ? undefined : roleLabel(data?.targetLabel),
);
const path = $derived(
	edgePath(
		padEndpoints(params, {
			source: !!socketPoint || !!sourcePort,
			target: !!slotPoint || !!targetPort,
		}),
	),
);
</script>

<BaseEdge {id} path={path[0]} {style} class="assembly" />
{#if label}
	<!-- The hover says what of the consumer makes it; absent means all of it. -->
	<text class="edge-label" x={path[1]} y={path[2]} text-anchor="middle" dominant-baseline="middle">{#if madeBy}<title>{madeBy}</title>{/if}{label}</text>
{/if}
{#if sourcePort && data?.sourceLabel}
	{@const at = portCentre(params.sourceX, params.sourceY, params.sourcePosition)}
	<PortBadge class="end consumer" x={at.x} y={at.y} label={sourcePort} title={data.sourceLabel} />
{/if}
{#if targetPort && data?.targetLabel}
	{@const at = portCentre(params.targetX, params.targetY, params.targetPosition)}
	<PortBadge class="end provider" x={at.x} y={at.y} label={targetPort} title={data.targetLabel} />
{/if}
