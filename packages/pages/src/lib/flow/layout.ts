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
		n.group?.length ?? 0,
		...(n.attributes ?? []).map((a) => a.name.length + a.type.length + 3),
	);
	const width = Math.min(320, Math.max(140, longest * 7 + 32));
	const height =
		44 +
		(n.group ? 16 : 0) +
		(n.chips?.length ? 22 : 0) +
		(n.attributes?.length ?? 0) * 20;
	return { width, height };
}

/** Layered layout, left to right for maps, top to bottom for flows. */
export function layout(
	graph: Graph,
	direction: "LR" | "TB" = "LR",
): Positioned {
	const g = new dagre.graphlib.Graph();
	g.setGraph({
		rankdir: direction,
		nodesep: 40,
		ranksep: 80,
		marginx: 20,
		marginy: 20,
	});
	g.setDefaultEdgeLabel(() => ({}));
	for (const n of graph.nodes) g.setNode(n.id, nodeSize(n));
	for (const e of graph.edges) g.setEdge(e.source, e.target);
	dagre.layout(g);
	const positions = new Map<
		string,
		{ x: number; y: number; width: number; height: number }
	>();
	for (const n of graph.nodes) {
		const { x, y, width, height } = g.node(n.id);
		positions.set(n.id, { x: x - width / 2, y: y - height / 2, width, height });
	}
	return { ...graph, positions };
}
