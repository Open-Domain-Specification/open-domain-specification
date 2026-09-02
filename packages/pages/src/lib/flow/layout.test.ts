import { describe, expect, it } from "vitest";
import type { Graph, GraphNode } from "./graph";
import { layout, nodeSize } from "./layout";

const bare: GraphNode = { id: "#/a", label: "A", icon: "symbol-field" };

describe("nodeSize", () => {
	it("gives a node with no group, chips or attributes the base height", () => {
		expect(nodeSize(bare).height).toBe(44);
	});

	it("adds height for a group label", () => {
		const withGroup: GraphNode = { ...bare, group: "Some Group" };
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
			group: "A very long group label indeed",
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
});
