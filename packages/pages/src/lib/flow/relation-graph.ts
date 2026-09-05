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

/** Tone per node kind: root entities stand out, value objects recede. */
const TONES: Record<ODSRelationMapNode["type"], GraphNode["tone"]> = {
	entity_root: "core",
	entity: "",
	valueobject: "muted",
};

/**
 * Edge component per line the map draws; each renders its own UML connector.
 * `identifies` is one of them: the identity an attribute holds of another
 * root, which is the only line allowed to leave a bounded context.
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
		nodes: [...map.nodes.values()].map((n) => ({
			id: n.id,
			type: "relation",
			label: n.name ?? n.id,
			icon: n.type === "valueobject" ? ICONS.valueobject : ICONS.entity,
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
		})),
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
