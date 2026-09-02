import type {
	EntityRelationType,
	ODSRelationMap,
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

/** Edge component per relation kind; each draws its own UML connector. */
export const relationEdgeType = (relation: EntityRelationType) =>
	`relation-${relation}` as const;

/**
 * The relation map as UML class boxes. As in the Graphviz image there is one
 * flat cluster per aggregate (the innermost namespace), labelled with the
 * aggregate's path below the workspace.
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
			label: n.name,
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
			targetLabel: e.cardinality,
		})),
	};
}
