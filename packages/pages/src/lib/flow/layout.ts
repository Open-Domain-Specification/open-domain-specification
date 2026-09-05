import dagre from "@dagrejs/dagre";
import type { Graph, GraphNode } from "./graph";

export type Positioned = Graph & {
	positions: Map<
		string,
		{ x: number; y: number; width: number; height: number }
	>;
};

/** Rough box for a node so dagre can space them; the component renders at its natural size. */
export function nodeSize(n: GraphNode): { width: number; height: number } {
	const longest = Math.max(
		n.label.length + 4,
		n.groupPath?.length ?? 0,
		...(n.attributes ?? []).map((a) => a.name.length + a.type.length + 3),
	);
	const width = Math.min(320, Math.max(140, longest * 7 + 32));
	const height =
		44 +
		(n.groupPath ? 16 : 0) +
		(n.chips?.length ? 22 : 0) +
		(n.attributes?.length ?? 0) * 20;
	return { width, height };
}

/**
 * Layered layout, left to right: every map this package draws, the flow map
 * included, reads along the rank axis from left to right, and `direction`
 * takes `"TB"` for a caller that wants the ranks stacked instead. Groups are
 * dagre clusters, so they come back as boxes around their members with dagre's
 * own padding; `positions` holds group boxes as well as node boxes, all in
 * absolute flow coordinates.
 */
export function layout(
	graph: Graph,
	direction: "LR" | "TB" = "LR",
): Positioned {
	const g = new dagre.graphlib.Graph({ compound: true });
	g.setGraph({
		rankdir: direction,
		nodesep: 40,
		ranksep: 80,
		marginx: 20,
		marginy: 20,
	});
	g.setDefaultEdgeLabel(() => ({}));
	const groups = graph.groups ?? [];
	for (const grp of groups) g.setNode(grp.id, { label: grp.label });
	for (const grp of groups) if (grp.parent) g.setParent(grp.id, grp.parent);
	for (const n of graph.nodes) g.setNode(n.id, nodeSize(n));
	for (const n of graph.nodes) if (n.groupId) g.setParent(n.id, n.groupId);
	for (const e of graph.edges) g.setEdge(e.source, e.target);
	dagre.layout(g);
	const positions = new Map<
		string,
		{ x: number; y: number; width: number; height: number }
	>();
	for (const id of [
		...groups.map((grp) => grp.id),
		...graph.nodes.map((n) => n.id),
	]) {
		const { x, y, width, height } = g.node(id);
		positions.set(id, { x: x - width / 2, y: y - height / 2, width, height });
	}
	return { ...graph, positions };
}
