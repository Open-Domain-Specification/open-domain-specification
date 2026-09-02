import type {
	ODSContextMapEdge,
	ODSContextMapNode,
	ODSRelationMapEdge,
	ODSRelationMapNode,
} from "@open-domain-specification/core";
import {
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import { consumableGraph, contextGraph, relationGraph } from "./graph";
import { layout } from "./layout";

const { workspace } = petstoreModel();

describe("graph adapters", () => {
	it("map every context node and edge with refs as ids", () => {
		const map = ODSContextMap.fromWorkspace(workspace);
		const g = contextGraph(map);
		expect(g.nodes.map((n) => n.id).sort()).toEqual(
			[...map.nodes.keys()].sort(),
		);
		expect(g.edges).toHaveLength(map.edges.size);
		for (const e of g.edges) {
			expect(g.nodes.some((n) => n.id === e.source)).toBe(true);
			expect(g.nodes.some((n) => n.id === e.target)).toBe(true);
		}
	});
	it("carry attributes into relation nodes and slots into consumable edge labels", () => {
		const bc = [...workspace.boundedcontexts.values()][0];
		const rel = relationGraph(
			ODSRelationMap.fromAggregate([...bc.aggregates.values()][0]),
		);
		expect(rel.nodes.some((n) => (n.attributes?.length ?? 0) > 0)).toBe(true);
		const con = consumableGraph(ODSConsumableMap.fromBoundedContext(bc));
		expect(con.edges.every((e) => e.label)).toBe(true);
	});
	it("lay out every node with a position", () => {
		const g = layout(contextGraph(ODSContextMap.fromWorkspace(workspace)));
		expect(g.positions.size).toBe(g.nodes.length);
		for (const p of g.positions.values())
			expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
	});
});

describe("contextGraph branches", () => {
	function node(overrides: Partial<ODSContextMapNode> = {}): ODSContextMapNode {
		return {
			id: "#/boundedcontexts/x",
			name: "X",
			namespace: [],
			...overrides,
		};
	}

	it("has no group when the namespace has one entry or fewer", () => {
		const map = {
			nodes: new Map([
				["#/x", node({ namespace: [{ id: "workspace", name: "Workspace" }] })],
			]),
			edges: new Map(),
		} as unknown as ODSContextMap;
		expect(contextGraph(map).nodes[0].group).toBeUndefined();
	});

	it("groups by everything past the first namespace entry", () => {
		const map = {
			nodes: new Map([
				[
					"#/x",
					node({
						namespace: [
							{ id: "workspace", name: "Workspace" },
							{ id: "domain", name: "Domain" },
							{ id: "sub", name: "Sub" },
						],
					}),
				],
			]),
			edges: new Map(),
		} as unknown as ODSContextMap;
		expect(contextGraph(map).nodes[0].group).toBe("Domain / Sub");
	});

	it("carries no team chip and a plain tone when there is no team and no big ball of mud", () => {
		const map = {
			nodes: new Map([["#/x", node()]]),
			edges: new Map(),
		} as unknown as ODSContextMap;
		const [n] = contextGraph(map).nodes;
		expect(n.chips).toEqual([]);
		expect(n.tone).toBe("");
	});

	it("chips the team and marks a big ball of mud with the warn tone", () => {
		const map = {
			nodes: new Map([
				[
					"#/x",
					node({
						team: { id: "#/teams/a", name: "Team A" },
						bigBallOfMud: true,
					}),
				],
			]),
			edges: new Map(),
		} as unknown as ODSContextMap;
		const [n] = contextGraph(map).nodes;
		expect(n.chips).toEqual(["Team A", "big ball of mud"]);
		expect(n.tone).toBe("warn");
	});

	it("gives roles as undefined text when a relationship declares none", () => {
		const source = node({ id: "#/a" });
		const target = node({ id: "#/b" });
		const edge: ODSContextMapEdge = {
			source,
			target,
			type: "upstream-downstream",
			upstreamRoles: [],
			downstreamRoles: [],
			implied: false,
		};
		const map = {
			nodes: new Map([
				["#/a", source],
				["#/b", target],
			]),
			edges: new Map([["e", edge]]),
		} as unknown as ODSContextMap;
		const [e] = contextGraph(map).edges;
		expect(e.sourceLabel).toBeUndefined();
		expect(e.targetLabel).toBeUndefined();
	});
});

describe("relationGraph branches", () => {
	function node(
		overrides: Partial<ODSRelationMapNode> = {},
	): ODSRelationMapNode {
		return {
			id: "#/x",
			name: "X",
			namespace: [],
			type: "entity",
			attributes: [],
			...overrides,
		};
	}

	it("gives a plain, non-root entity no chips and a plain tone", () => {
		const map = {
			nodes: new Map([["#/x", node()]]),
			edges: new Map(),
		} as unknown as ODSRelationMap;
		const [n] = relationGraph(map).nodes;
		expect(n.chips).toEqual([]);
		expect(n.tone).toBe("");
	});

	it("marks the root entity as core with a root chip", () => {
		const map = {
			nodes: new Map([["#/x", node({ type: "entity_root" })]]),
			edges: new Map(),
		} as unknown as ODSRelationMap;
		const [n] = relationGraph(map).nodes;
		expect(n.chips).toEqual(["root"]);
		expect(n.tone).toBe("core");
	});

	it("marks a value object as muted with a value-object chip", () => {
		const map = {
			nodes: new Map([["#/x", node({ type: "valueobject" })]]),
			edges: new Map(),
		} as unknown as ODSRelationMap;
		const [n] = relationGraph(map).nodes;
		expect(n.chips).toEqual(["value object"]);
		expect(n.tone).toBe("muted");
	});

	it("dashes a references relation but not includes/uses", () => {
		const a = node({ id: "#/a" });
		const b = node({ id: "#/b" });
		const edge: ODSRelationMapEdge = {
			source: a,
			target: b,
			relation: "references",
			label: "points at",
		};
		const map = {
			nodes: new Map([
				["#/a", a],
				["#/b", b],
			]),
			edges: new Map([["e", edge]]),
		} as unknown as ODSRelationMap;
		expect(relationGraph(map).edges[0].dashed).toBe(true);
	});
});
