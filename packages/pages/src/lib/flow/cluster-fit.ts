import type { Node } from "@xyflow/svelte";
import type { GraphNode } from "./graph";
import { nodeSize } from "./layout";

export type Box = { x: number; y: number; width: number; height: number };

/** Absolute position of a node: Svelte Flow keeps children relative to their parent. */
export function absolutePosition(
	nodes: Node[],
	n: Node,
): { x: number; y: number } {
	const parent = n.parentId
		? nodes.find((p) => p.id === n.parentId)
		: undefined;
	if (!parent) return n.position;
	const o = absolutePosition(nodes, parent);
	return { x: o.x + n.position.x, y: o.y + n.position.y };
}

/** Absolute box of a leaf node, measured once rendered, estimated before. */
export function absoluteBox(nodes: Node[], n: Node): Box {
	const fallback = nodeSize(n.data as unknown as GraphNode);
	return {
		...absolutePosition(nodes, n),
		width: n.measured?.width ?? fallback.width,
		height: n.measured?.height ?? fallback.height,
	};
}

/** Room round a cluster's members; the top leaves space for its label. */
const PAD = { top: 28, side: 16, bottom: 16 };

const depthOf = (byId: Map<string, Node>, id: string) => {
	let d = 0;
	for (let p = byId.get(id)?.parentId; p; p = byId.get(p)?.parentId) d++;
	return d;
};

/**
 * Refits every cluster node round its members after a drag, so a node moved
 * out of its cluster stretches the box after it, innermost clusters first
 * and each parent round its fitted children. Leaf nodes keep their absolute
 * positions; only their relative offsets change with the cluster origins.
 * Nodes that end up unchanged are returned as the same objects.
 */
export function fitClusters(nodes: Node[]): Node[] {
	const byId = new Map(nodes.map((n) => [n.id, n]));
	const clusters = nodes.filter((n) => n.type === "cluster");
	if (clusters.length === 0) return nodes;
	const boxes = new Map<string, Box>();
	for (const n of nodes)
		if (n.type !== "cluster") boxes.set(n.id, absoluteBox(nodes, n));
	const fitted = new Map<string, Box>();
	for (const c of [...clusters].sort(
		(a, b) => depthOf(byId, b.id) - depthOf(byId, a.id),
	)) {
		const members = nodes
			.filter((n) => n.parentId === c.id)
			.map((n) => (fitted.get(n.id) ?? boxes.get(n.id)) as Box);
		if (members.length === 0) {
			fitted.set(c.id, {
				...absolutePosition(nodes, c),
				width: c.width ?? 0,
				height: c.height ?? 0,
			});
			continue;
		}
		const x = Math.min(...members.map((m) => m.x)) - PAD.side;
		const y = Math.min(...members.map((m) => m.y)) - PAD.top;
		const right = Math.max(...members.map((m) => m.x + m.width)) + PAD.side;
		const bottom = Math.max(...members.map((m) => m.y + m.height)) + PAD.bottom;
		fitted.set(c.id, { x, y, width: right - x, height: bottom - y });
	}
	return nodes.map((n) => {
		const abs = (fitted.get(n.id) ?? boxes.get(n.id)) as Box;
		const origin = n.parentId
			? (fitted.get(n.parentId) as Box)
			: { x: 0, y: 0 };
		const position = { x: abs.x - origin.x, y: abs.y - origin.y };
		if (n.type === "cluster")
			return { ...n, position, width: abs.width, height: abs.height };
		return n.position.x === position.x && n.position.y === position.y
			? n
			: { ...n, position };
	});
}
