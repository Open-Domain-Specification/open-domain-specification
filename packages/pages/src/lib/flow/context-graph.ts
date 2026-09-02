import type {
	ODSContextMap,
	ODSContextMapNode,
} from "@open-domain-specification/core";
import {
	DOWNSTREAM_ROLE_LABELS,
	RELATIONSHIP_LABELS,
	UPSTREAM_ROLE_LABELS,
} from "@open-domain-specification/graphviz";
import { ICONS } from "../icons";
import {
	deepestGroup,
	type Graph,
	type GraphEdge,
	type GraphNode,
	groupPathOf,
	isSymmetricRelationship,
	namespaceGroups,
} from "./graph";

const roles = (labels: Record<string, string>, values: string[]) =>
	values.map((it) => labels[it]).join("+") || undefined;

/** Extra data a context node carries for the ContextNode component. */
export type ContextNodeData = GraphNode & {
	type: "context";
	team?: string;
	bigBallOfMud: boolean;
	description?: string;
	/** The outermost cluster below the workspace, e.g. the domain, for the colour band. */
	cluster?: string;
};

/** A stable hue for a cluster name so nodes in one namespace share a colour band. */
export function clusterHue(name: string): number {
	let h = 0;
	for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
	return h;
}

function contextNode(n: ODSContextMapNode): ContextNodeData {
	return {
		id: n.id,
		type: "context",
		label: n.name,
		icon: ICONS.boundedcontext,
		groupPath: groupPathOf(n.namespace),
		groupId: deepestGroup(n.namespace),
		cluster: n.namespace[1]?.name,
		chips: [
			...(n.team ? [n.team.name] : []),
			...(n.bigBallOfMud ? ["big ball of mud"] : []),
		],
		tone: n.bigBallOfMud ? "warn" : "",
		team: n.team?.name,
		bigBallOfMud: n.bigBallOfMud === true,
		description: n.description,
	};
}

/**
 * The context map as a graph: one ContextNode per bounded context and one
 * ContextEdge per relationship carrying the stereotype and role abbreviations
 * the Graphviz image shows. Symmetric types have no arrowhead; implied edges
 * are dashed. Every namespace level, the workspace included, is a group, as
 * the image nests its clusters.
 */
export function contextGraph(map: ODSContextMap): Graph {
	const edges: GraphEdge[] = [...map.edges.entries()].map(([id, e]) => {
		const directed = !isSymmetricRelationship(e.type);
		return {
			id,
			type: "context",
			source: e.source.id,
			target: e.target.id,
			label: RELATIONSHIP_LABELS[e.type],
			dashed: e.implied,
			directed,
			sourceLabel: directed
				? roles(UPSTREAM_ROLE_LABELS, e.upstreamRoles)
				: undefined,
			targetLabel: directed
				? roles(DOWNSTREAM_ROLE_LABELS, e.downstreamRoles)
				: undefined,
		};
	});
	const nodes = [...map.nodes.values()];
	return {
		nodes: nodes.map(contextNode),
		edges,
		groups: namespaceGroups(nodes),
	};
}
