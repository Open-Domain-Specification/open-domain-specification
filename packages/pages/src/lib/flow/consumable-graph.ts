import type {
	ConsumableType,
	DownstreamRole,
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

/** A consumable a consumer uses, drawn as a socket on its node. */
export type RequiredSlot = {
	/** The consumable's ref; also the id of the source handle the assembly connector leaves from. */
	id: string;
	name: string;
	/** The downstream role the consumer protects itself with. */
	pattern?: DownstreamRole;
};

export type ConsumableNodeData = GraphNode & {
	description?: string;
	/** Provided interfaces: the lollipops. */
	slots: ConsumableSlot[];
	/** Required interfaces: the sockets, one per consumable the node consumes. */
	requires: RequiredSlot[];
};

/** Icon for a slot: events broadcast, operations act, unknown kinds export. */
export const slotIcon = (kind?: ConsumableType) =>
	kind === "event"
		? ICONS.event
		: kind === "operation"
			? ICONS.command
			: ICONS.consumable;

/**
 * Providers and consumers as UML components typed `consumable`, each
 * listing the consumables it provides as lollipop slots and those it
 * consumes as sockets, and one `consumable` assembly connector per
 * consumption from the consumer's socket to the provider's lollipop, both
 * handles named by the consumable's ref. The edge label is the consumable
 * name and the end labels are the raw patterns; the components abbreviate
 * them on the ports. Every namespace level is a group, as the image nests
 * its clusters.
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
	const requiresOf = (nodeId: string): RequiredSlot[] => {
		const seen = new Map<string, RequiredSlot>();
		for (const e of map.edges.values())
			if (e.source.id === nodeId && !seen.has(e.target.id))
				seen.set(e.target.id, {
					id: e.target.id,
					name: e.target.name,
					pattern: e.sourcePattern,
				});
		return [...seen.values()];
	};
	const nodes: ConsumableNodeData[] = [...map.nodes.values()].map((n) => {
		const slots = slotsOf(n.id);
		const requires = requiresOf(n.id);
		return {
			id: n.id,
			type: "consumable",
			label: n.name,
			description: n.description,
			icon: n.type === "service" ? ICONS.service : ICONS.aggregate,
			groupPath: groupPathOf(n.namespace),
			groupId: deepestGroup(n.namespace),
			slots,
			requires,
			// The layout sizes nodes by their attribute rows; slots and sockets take the same room.
			attributes: [...slots, ...requires].map((s) => ({
				name: s.name,
				type: "kind" in s ? s.kind : "requires",
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
			sourceHandle: e.target.id,
			targetHandle: e.target.id,
			label: e.target.name,
			// An assembly connector: the socket meets the lollipop, no arrowhead.
			directed: false,
			sourceLabel: e.sourcePattern,
			targetLabel: e.targetPattern,
		})),
	};
}
