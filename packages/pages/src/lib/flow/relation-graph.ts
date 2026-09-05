import type {
	ODSRelationMap,
	ODSRelationMapEdge,
	ODSRelationMapNode,
} from "@open-domain-specification/core";
import { STEREOTYPES } from "@open-domain-specification/graphviz";
import { ICONS } from "../icons";
import {
	type Graph,
	type GraphGroup,
	type GraphNode,
	groupIdOf,
	groupPathOf,
} from "./graph";

/**
 * Tone per node kind: root entities stand out, value objects recede, and a
 * system nobody here owns recedes too — it is on this map only because an
 * identity attribute names it (decision 28). A value object borrowed from
 * another context recedes as well, and its dashed border is the same one every
 * muted box carries: it is drawn here but owned elsewhere (decision 16, third
 * amendment).
 */
const TONES: Record<ODSRelationMapNode["type"], GraphNode["tone"]> = {
	entity_root: "core",
	entity: "",
	valueobject: "muted",
	foreign_valueobject: "muted",
	external_context: "muted",
};

/** The icon each kind of box carries. */
const ICON_OF: Record<ODSRelationMapNode["type"], string> = {
	entity_root: ICONS.entity,
	entity: ICONS.entity,
	valueobject: ICONS.valueobject,
	foreign_valueobject: ICONS.valueobject,
	external_context: ICONS.boundedcontext,
};

/**
 * A relation-map node, plus what the legend needs to know about it: `borrowed`
 * is a value object of another context, drawn in that context's own cluster so
 * the box says whose it is (decision 16, third amendment).
 */
export type RelationNodeData = GraphNode & { borrowed?: boolean };

/** One class box, with the marks the legend reads off it. */
function relationNode(n: ODSRelationMapNode): RelationNodeData {
	return {
		id: n.id,
		type: "relation",
		label: n.name ?? n.id,
		icon: ICON_OF[n.type],
		groupPath: groupPathOf(n.namespace),
		groupId: n.namespace.length
			? groupIdOf(n.namespace[n.namespace.length - 1])
			: undefined,
		chips: [STEREOTYPES[n.type]],
		attributes: n.attributes.map((a) => ({
			name: a.name,
			type: a.type,
			identity: a.identity,
		})),
		tone: TONES[n.type],
		borrowed: n.type === "foreign_valueobject",
	};
}

/**
 * Edge component per line the map draws; each renders its own UML connector.
 * `identifies` is one of them: the identity an attribute holds of another
 * entity, which is the only line allowed to leave a bounded context. It lands
 * on that entity, child or root, inside the entity's own aggregate group, or
 * on an external context's own box when the id belongs to a system whose
 * entities are not ours to state (decision 28).
 * `specialises` is another: a generalisation from a kind to what it is a kind
 * of, which leaves the context only when the parent is a kernel's.
 */
export const relationEdgeType = (relation: ODSRelationMapEdge["relation"]) =>
	`relation-${relation}` as const;

/**
 * The relation map as a UML class diagram. As in the Graphviz image there is
 * one flat cluster per aggregate (the innermost namespace), labelled with
 * the aggregate's path below the workspace. Edges carry the cardinality at
 * the part end and, for a composition, "1" at the whole: a part belongs to
 * exactly one whole.
 */
export function relationGraph(map: ODSRelationMap): Graph {
	const groups = new Map<string, GraphGroup>();
	for (const n of map.nodes.values()) {
		const aggregate = n.namespace[n.namespace.length - 1];
		if (aggregate && !groups.has(groupIdOf(aggregate)))
			groups.set(groupIdOf(aggregate), {
				id: groupIdOf(aggregate),
				label: groupPathOf(n.namespace) ?? aggregate.name,
			});
	}
	return {
		groups: [...groups.values()],
		nodes: [...map.nodes.values()].map(relationNode),
		// The relation edge owns its line style and markers, so no generic dashing or arrow.
		edges: [...map.edges.entries()].map(([id, e]) => ({
			id,
			type: relationEdgeType(e.relation),
			source: e.source.id,
			target: e.target.id,
			label: e.label,
			directed: false,
			dashed: false,
			sourceLabel: e.relation === "includes" ? "1" : undefined,
			targetLabel: e.cardinality,
		})),
	};
}
