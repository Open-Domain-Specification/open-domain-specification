import type {
	ConsumableType,
	ODSConsumableMap,
	UpstreamRole,
} from "@open-domain-specification/core";
import { ICONS } from "../icons";
import {
	deepestGroup,
	type Graph,
	type GraphNode,
	groupPathOf,
	namespaceGroups,
} from "./graph";

/** A consumable a provider offers, drawn as a port on its node. */
export type ConsumableSlot = {
	/** The consumable's ref; also the id of the handle edges attach to. */
	id: string;
	name: string;
	description?: string;
	/** Event or operation; the icon follows it. */
	kind: ConsumableType;
	/** The upstream role the consumable is offered under. */
	pattern?: UpstreamRole;
};

export type ConsumableNodeData = GraphNode & {
	description?: string;
	slots: ConsumableSlot[];
};

/** Icon for a slot: events broadcast, operations act, unknown kinds export. */
export const slotIcon = (kind?: ConsumableType) =>
	kind === "event"
		? ICONS.event
		: kind === "operation"
			? ICONS.command
			: ICONS.consumable;

/**
 * Providers and consumers as nodes typed `consumable`, each provider listing
 * its consumables as slots, and one `consumable` edge per consumption from
 * the consumer to the provider's slot. The edge label is the consumable name
 * and the end labels are the raw patterns; the edge component abbreviates.
 * Each edge targets the slot's handle by id. Every namespace level is a
 * group, as the image nests its clusters.
 */
export function consumableGraph(map: ODSConsumableMap): Graph {
	const patterns = new Map<string, UpstreamRole | undefined>();
	for (const e of map.edges.values()) {
		if (!patterns.has(e.target.id)) patterns.set(e.target.id, e.targetPattern);
	}
	const slotsOf = (nodeId: string): ConsumableSlot[] =>
		[...map.slots.values()]
			.filter((s) => s.node.id === nodeId)
			.map((s) => ({
				id: s.id,
				name: s.name,
				description: s.description,
				kind: s.type,
				pattern: patterns.get(s.id),
			}));
	const nodes: ConsumableNodeData[] = [...map.nodes.values()].map((n) => {
		const slots = slotsOf(n.id);
		return {
			id: n.id,
			type: "consumable",
			label: n.name,
			description: n.description,
			icon: n.type === "service" ? ICONS.service : ICONS.aggregate,
			groupPath: groupPathOf(n.namespace),
			groupId: deepestGroup(n.namespace),
			slots,
			// The layout sizes nodes by their attribute rows; slots take the same room.
			attributes: slots.map((s) => ({
				name: s.name,
				type: s.kind,
				identity: false,
			})),
		};
	});
	return {
		nodes,
		groups: namespaceGroups([...map.nodes.values()]),
		edges: [...map.edges.entries()].map(([id, e]) => ({
			id,
			type: "consumable",
			source: e.source.id,
			target: e.target.node.id,
			targetHandle: e.target.id,
			label: e.target.name,
			directed: true,
			sourceLabel: e.sourcePattern,
			targetLabel: e.targetPattern,
		})),
	};
}
