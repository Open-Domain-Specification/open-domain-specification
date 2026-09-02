import { describe, expect, it } from "vitest";
import type { Graph, GraphNode } from "./graph";
import { layout, nodeSize } from "./layout";

const bare: GraphNode = {
	id: "#/a",
	type: "context",
	label: "A",
	icon: "symbol-field",
};

describe("nodeSize", () => {
	it("gives a node with no group, chips or attributes the base height", () => {
		expect(nodeSize(bare).height).toBe(44);
	});

	it("adds height for a group label", () => {
		const withGroup: GraphNode = { ...bare, groupPath: "Some Group" };
		expect(nodeSize(withGroup).height).toBe(44 + 16);
	});

	it("adds height for chips", () => {
		const withChips: GraphNode = { ...bare, chips: ["a"] };
		expect(nodeSize(withChips).height).toBe(44 + 22);
	});

	it("adds height per attribute", () => {
		const withAttrs: GraphNode = {
			...bare,
			attributes: [
				{ name: "id", type: "string", identity: true },
				{ name: "name", type: "string", identity: false },
			],
		};
		expect(nodeSize(withAttrs).height).toBe(44 + 2 * 20);
	});

	it("widens for a long group label even with a short one attribute", () => {
		const wide: GraphNode = {
			...bare,
			label: "A",
			groupPath: "A very long group label indeed",
		};
		expect(nodeSize(wide).width).toBeGreaterThan(140);
	});
});

describe("layout", () => {
	it("positions a graph with no edges", () => {
		const graph: Graph = { nodes: [bare], edges: [] };
		const positioned = layout(graph);
		expect(positioned.positions.get("#/a")).toBeDefined();
	});

	it("boxes nested groups around their members with padding", () => {
		const graph: Graph = {
			groups: [
				{ id: "g:ws", label: "Workspace" },
				{ id: "g:dom", label: "Domain", parent: "g:ws" },
			],
			nodes: [
				{ ...bare, groupId: "g:dom" },
				{ ...bare, id: "#/b", label: "B", groupId: "g:ws" },
				{ ...bare, id: "#/c", label: "C" },
			],
			edges: [{ id: "e", type: "context", source: "#/a", target: "#/b" }],
		};
		const { positions } = layout(graph);
		const a = positions.get("#/a")!;
		const dom = positions.get("g:dom")!;
		const ws = positions.get("g:ws")!;
		const inside = (
			inner: { x: number; y: number; width: number; height: number },
			outer: { x: number; y: number; width: number; height: number },
		) =>
			inner.x > outer.x &&
			inner.y > outer.y &&
			inner.x + inner.width < outer.x + outer.width &&
			inner.y + inner.height < outer.y + outer.height;
		expect(inside(a, dom)).toBe(true);
		expect(inside(dom, ws)).toBe(true);
		expect(inside(positions.get("#/b")!, ws)).toBe(true);
		expect(inside(positions.get("#/c")!, ws)).toBe(false);
	});
});
