import type { ODSConsumableMap } from "@open-domain-specification/core";
import { ICONS } from "../icons";
import { type Graph, groupOf } from "./graph";

export function consumableGraph(map: ODSConsumableMap): Graph {
	return {
		nodes: [...map.nodes.values()].map((n) => ({
			id: n.id,
			label: n.name,
			icon: n.type === "service" ? ICONS.service : ICONS.aggregate,
			group: groupOf(n.namespace),
		})),
		edges: [...map.edges.entries()].map(([id, e]) => ({
			id,
			source: e.source.id,
			target: e.target.node.id,
			label: e.target.name,
			directed: true,
			sourceLabel: e.sourcePattern,
			targetLabel: e.targetPattern,
		})),
	};
}
