import { PATTERNS } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { depthOf, flowEdges, flowNodes, groupLabels } from "./flow-nodes";
import type { Graph } from "./graph";
import { layout } from "./layout";

const graph: Graph = {
	groups: [
		{ id: "g:ws", label: "Workspace" },
		{ id: "g:dom", label: "Domain", parent: "g:ws" },
	],
	nodes: [
		{ id: "#/a", type: "context", label: "A", icon: "x", groupId: "g:dom" },
		{ id: "#/b", type: "context", label: "B", icon: "x", groupId: "g:ws" },
		{ id: "#/c", type: "context", label: "C", icon: "x" },
		{ id: "#/d", type: "consumable", label: "D", icon: "x" },
	],
	edges: [
		{
			id: "e",
			type: "context",
			source: "#/a",
			target: "#/b",
			label: "U/D",
			dashed: true,
			directed: true,
			sourceLabel: "OHS",
			sourceHandle: "s",
			targetHandle: "t",
		},
		{ id: "f", type: "context", source: "#/b", target: "#/c" },
	],
};
const positioned = layout(graph);
const opts = { floating: false, sketch: false, free: false };

describe("flowNodes", () => {
	it("lists clusters before nodes, nests by parent and keeps nodes to their parent's extent", () => {
		const nodes = flowNodes(positioned, opts);
		expect(nodes.map((n) => n.id)).toEqual([
			"g:ws",
			"g:dom",
			"#/a",
			"#/b",
			"#/c",
			"#/d",
		]);
		const [ws, dom, a, , c, d] = nodes;
		expect(ws).toMatchObject({
			type: "cluster",
			extent: undefined,
			hidden: false,
			draggable: false,
			data: { label: "Workspace", depth: 0 },
		});
		expect(dom).toMatchObject({
			parentId: "g:ws",
			extent: "parent",
			data: { depth: 1 },
		});
		expect(a).toMatchObject({
			type: "context",
			parentId: "g:dom",
			extent: "parent",
			draggable: true,
			data: { label: "A", floating: false, sketch: false },
		});
		// Only context nodes carry the sketch flag; other node types get floating alone.
		expect(d).toMatchObject({
			type: "consumable",
			data: { label: "D", floating: false },
		});
		expect((d.data as { sketch?: boolean }).sketch).toBeUndefined();
		expect(c.parentId).toBeUndefined();
		expect(c.extent).toBeUndefined();
		// A child's position is relative to its parent's box.
		const box = positioned.positions.get("#/a")!;
		const parent = positioned.positions.get("g:dom")!;
		expect(a.position).toEqual({ x: box.x - parent.x, y: box.y - parent.y });
		expect(c.position).toEqual({
			x: positioned.positions.get("#/c")!.x,
			y: positioned.positions.get("#/c")!.y,
		});
	});
	it("frees nodes from their parent's extent, hides clusters in sketch and passes the options into the data", () => {
		const nodes = flowNodes(positioned, {
			floating: true,
			sketch: true,
			free: true,
		});
		expect(nodes[0].hidden).toBe(true);
		// Clusters still keep to their parents; only the nodes roam.
		expect(nodes[1].extent).toBe("parent");
		expect(nodes[2].parentId).toBe("g:dom");
		expect(nodes[2].extent).toBeUndefined();
		expect(nodes[2].data).toMatchObject({ floating: true, sketch: true });
	});
	it("handles a graph without groups", () => {
		const bare = layout({ nodes: graph.nodes.slice(2, 3), edges: [] });
		expect(flowNodes(bare, opts)).toHaveLength(1);
		expect(depthOf(bare, undefined)).toBe(0);
		expect(groupLabels(bare).size).toBe(0);
		expect(groupLabels(positioned).get("g:dom")).toBe("Domain");
	});
});

describe("flowEdges", () => {
	it("animates every edge, dashes and arrows as the graph says, and carries the handles and end labels", () => {
		const [e, f] = flowEdges(positioned);
		expect(e).toMatchObject({
			id: "e",
			type: "context",
			source: "#/a",
			target: "#/b",
			sourceHandle: "s",
			targetHandle: "t",
			label: "U/D",
			animated: true,
			class: "dashed",
			data: { sourceLabel: "OHS", targetLabel: undefined },
		});
		expect(e.markerEnd).toMatchObject({
			type: "arrowclosed",
			width: 9,
			height: 9,
			color: "var(--fg)",
		});
		expect(f).toMatchObject({
			animated: true,
			markerEnd: undefined,
			class: undefined,
		});
		// Nothing said about these edges' intents, so their badges stay unmarked.
		expect(e.data).not.toHaveProperty("disposition");
	});

	it("puts the intent's disposition and its one-line summary on the edge data", () => {
		const intent = {
			type: "shared-kernel",
			disposition: "refactor",
			comments: [{ text: "It should become a Published Language." }],
		} as unknown as NonNullable<Graph["edges"][number]["intent"]>;
		const [e] = flowEdges(
			layout({ ...graph, edges: [{ ...graph.edges[0], intent }] }, "LR"),
		);
		expect(e.data).toMatchObject({
			disposition: "refactor",
			summary: `${PATTERNS["shared-kernel"].summary} It should become a Published Language.`,
		});
	});

	it("says so on the badge when nobody has written anything down", () => {
		const intent = {
			type: "partnership",
			comments: [],
		} as unknown as NonNullable<Graph["edges"][number]["intent"]>;
		const [e] = flowEdges(
			layout({ ...graph, edges: [{ ...graph.edges[0], intent }] }, "LR"),
		);
		expect(e.data).toMatchObject({ disposition: "by-design" });
		expect((e.data as { summary: string }).summary).toContain(
			"No comments recorded yet.",
		);
	});
});
