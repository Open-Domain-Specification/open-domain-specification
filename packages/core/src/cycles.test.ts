import { describe, expect, it } from "vitest";
import { componentsOf, cyclesOf } from "./cycles";

/** A graph from an adjacency list, nodes in the order they are listed. */
function graph(edges: Record<string, string[]>) {
	return {
		nodes: Object.keys(edges),
		next: (node: string) => edges[node] ?? [],
	};
}

/** Components as groups of nodes, in the order Tarjan's walk completes them. */
function groups(component: Map<string, number>): string[][] {
	const byNumber: string[][] = [];
	for (const [node, number] of component) {
		byNumber[number] = [...(byNumber[number] ?? []), node];
	}
	return byNumber.map((members) => members.sort());
}

/** A ring of `length` nodes, 0 -> 1 -> ... -> length - 1 -> 0. */
function longRing(length: number) {
	const nodes = Array.from({ length }, (_, i) => i);
	return { nodes, next: (node: number) => [(node + 1) % length] };
}

describe("componentsOf", () => {
	it("groups nodes that reach each other, sinks completed first", () => {
		const { nodes, next } = graph({
			a: ["b"],
			b: ["c"],
			c: ["a", "d"],
			d: ["e"],
			e: ["d"],
			f: ["f"],
			g: [],
		});
		expect(groups(componentsOf(nodes, next))).toEqual([
			["d", "e"],
			["a", "b", "c"],
			["f"],
			["g"],
		]);
	});

	it("numbers a node reached only through another, not only those listed", () => {
		const { next } = graph({ a: ["b"], b: ["a", "c"], c: [] });
		expect(groups(componentsOf(["a"], next))).toEqual([["c"], ["a", "b"]]);
	});

	// Authored models reach tens of thousands of states once each call is
	// read per caller; the walk keeps its own stack rather than the engine's.
	it("walks a ring far deeper than the call stack in one component", () => {
		const { nodes, next } = longRing(20_000);
		const component = componentsOf(nodes, next);
		expect(new Set(component.values())).toEqual(new Set([0]));
		expect(component.size).toBe(20_000);
	});
});

describe("cyclesOf", () => {
	it("reports one ring per back edge, rotated, in the order it meets them", () => {
		const { nodes, next } = graph({
			a: ["b", "c"],
			b: ["a"],
			c: ["d"],
			d: ["c", "a"],
		});
		expect(cyclesOf(nodes, next, (node) => node)).toEqual([
			["a", "b"],
			["c", "d"],
			["a", "c", "d"],
		]);
	});

	it("walks a ring far deeper than the call stack", () => {
		const { nodes, next } = longRing(20_000);
		const rings = cyclesOf(nodes, next, (node) =>
			String(node).padStart(5, "0"),
		);
		expect(rings).toHaveLength(1);
		expect(rings[0]).toEqual(nodes);
	});
});
