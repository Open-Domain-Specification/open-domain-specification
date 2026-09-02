import type { ODSContextMap } from "@open-domain-specification/core";
import { ICONS } from "../icons";
import { type Graph, groupOf, isSymmetricRelationship } from "./graph";

export function contextGraph(map: ODSContextMap): Graph {
	return {
		nodes: [...map.nodes.values()].map((n) => ({
			id: n.id,
			label: n.name,
			icon: ICONS.boundedcontext,
			group: groupOf(n.namespace),
			chips: [
				...(n.team ? [n.team.name] : []),
				...(n.bigBallOfMud ? ["big ball of mud"] : []),
			],
			tone: n.bigBallOfMud ? "warn" : "",
		})),
		edges: [...map.edges.entries()].map(([id, e]) => ({
			id,
			source: e.source.id,
			target: e.target.id,
			label: e.type,
			dashed: e.implied,
			directed: !isSymmetricRelationship(e.type),
			sourceLabel: e.upstreamRoles.join(", ") || undefined,
			targetLabel: e.downstreamRoles.join(", ") || undefined,
		})),
	};
}
