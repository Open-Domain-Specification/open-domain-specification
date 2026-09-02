import type {
	ODSContextMapEdge,
	ODSContextMapNode,
} from "@open-domain-specification/core";
import {
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import {
	consumableGraph,
	contextGraph,
	namespaceGroups,
	relationGraph,
} from "./graph";
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
	it("lay out every node and group with a position", () => {
		const g = layout(contextGraph(ODSContextMap.fromWorkspace(workspace)));
		expect(g.groups?.length).toBeGreaterThan(1);
		expect(g.positions.size).toBe(g.nodes.length + (g.groups?.length ?? 0));
		for (const p of g.positions.values())
			expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
	});
});

describe("namespaceGroups", () => {
	it("orders parents before children whatever order the nodes arrive in", () => {
		const ws = { id: "ws", name: "WS" };
		const dom = { id: "dom", name: "Dom" };
		const sub = { id: "sub", name: "Sub" };
		const groups = namespaceGroups([
			{ namespace: [ws, dom, sub] },
			{ namespace: [ws, dom] },
			{ namespace: [ws] },
		]);
		expect(groups.map((g) => g.id)).toEqual([
			"cluster:ws",
			"cluster:dom",
			"cluster:sub",
		]);
		expect(groups[2].parent).toBe("cluster:dom");
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
		expect(contextGraph(map).nodes[0].groupPath).toBeUndefined();
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
		expect(contextGraph(map).nodes[0].groupPath).toBe("Domain / Sub");
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
