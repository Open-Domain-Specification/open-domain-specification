import type {
	ContextRelationship,
	ODSContextMap,
	ODSContextMapEdge,
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
		label: n.name ?? n.id,
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
 * The declared relationship an edge stands for, matched on its unordered pair
 * of contexts. A core map edge is a drawing instruction and carries no
 * evidence of its own, so the intent behind it is found by looking the pair up
 * in the workspace; an implied edge, which no relationship declares, finds
 * nothing and stays unmarked.
 */
const intentOf = (
	e: ODSContextMapEdge,
	relationships: ContextRelationship[],
): ContextRelationship | undefined =>
	e.implied
		? undefined
		: relationships.find(
				(r) =>
					(r.source.ref === e.source.id && r.target.ref === e.target.id) ||
					(r.source.ref === e.target.id && r.target.ref === e.source.id),
			);

/**
 * The context map as a graph: one ContextNode per bounded context and one
 * ContextEdge per relationship carrying the stereotype and role abbreviations
 * the Graphviz image shows. Symmetric types have no arrowhead; implied edges
 * are dashed. Every namespace level, the workspace included, is a group, as
 * the image nests its clusters.
 *
 * `relationships` are the workspace's own, which carry the evidence the map's
 * badges mark and disclose. Left out, the map draws exactly as it did before
 * the evidence layer existed.
 */
export function contextGraph(
	map: ODSContextMap,
	relationships: ContextRelationship[] = [],
): Graph {
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
			intent: intentOf(e, relationships),
		};
	});
	const nodes = [...map.nodes.values()];
	return {
		nodes: nodes.map(contextNode),
		edges,
		groups: namespaceGroups(nodes),
	};
}
