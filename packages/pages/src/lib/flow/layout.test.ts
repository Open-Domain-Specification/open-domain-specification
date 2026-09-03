import { Delaunay } from "d3-delaunay";
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

describe("layout keeps a domain's subdomains adjacent", () => {
	/** Two domains with two subdomains each, three contexts per subdomain, with some cross-domain edges. */
	const workspace: Graph = {
		groups: [
			{ id: "g:ws", label: "Workspace" },
			{ id: "g:d1", label: "Domain 1", parent: "g:ws" },
			{ id: "g:d2", label: "Domain 2", parent: "g:ws" },
			{ id: "g:d1s1", label: "Sub 1.1", parent: "g:d1" },
			{ id: "g:d1s2", label: "Sub 1.2", parent: "g:d1" },
			{ id: "g:d2s1", label: "Sub 2.1", parent: "g:d2" },
			{ id: "g:d2s2", label: "Sub 2.2", parent: "g:d2" },
		],
		nodes: ["d1s1", "d1s2", "d2s1", "d2s2"].flatMap((sub) =>
			[1, 2, 3].map((i) => ({
				...bare,
				id: `#/${sub}/${i}`,
				label: `${sub} ${i}`,
				groupId: `g:${sub}`,
			})),
		),
		edges: [
			{ id: "a", type: "context", source: "#/d1s1/1", target: "#/d2s2/3" },
			{ id: "b", type: "context", source: "#/d2s1/2", target: "#/d1s2/1" },
			{ id: "c", type: "context", source: "#/d1s1/2", target: "#/d1s2/2" },
			{ id: "d", type: "context", source: "#/d2s2/1", target: "#/d1s1/3" },
		],
	};
	it("lays every domain's contexts out as one connected region of Voronoi cells", () => {
		const { positions } = layout(workspace);
		const nodes = workspace.nodes.map((n) => {
			const box = positions.get(n.id)!;
			return {
				id: n.id,
				domain: n.groupId!.startsWith("g:d1") ? "d1" : "d2",
				x: box.x + box.width / 2,
				y: box.y + box.height / 2,
			};
		});
		const delaunay = Delaunay.from(nodes.map((n) => [n.x, n.y]));
		for (const domain of ["d1", "d2"]) {
			const members = nodes
				.map((n, i) => (n.domain === domain ? i : -1))
				.filter((i) => i >= 0);
			// Flood through Delaunay neighbours that stay in the domain: all members must be reached.
			const seen = new Set<number>([members[0]]);
			const queue = [members[0]];
			for (let i = queue.shift(); i !== undefined; i = queue.shift())
				for (const j of delaunay.neighbors(i))
					if (nodes[j].domain === domain && !seen.has(j)) {
						seen.add(j);
						queue.push(j);
					}
			expect([...seen].sort()).toEqual([...members].sort());
		}
		// The domain boxes never overlap, so their cells cannot interleave.
		const d1 = positions.get("g:d1")!;
		const d2 = positions.get("g:d2")!;
		const apart =
			d1.x + d1.width <= d2.x ||
			d2.x + d2.width <= d1.x ||
			d1.y + d1.height <= d2.y ||
			d2.y + d2.height <= d1.y;
		expect(apart).toBe(true);
	});
});
