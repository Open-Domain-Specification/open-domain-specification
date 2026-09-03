import type {
	ODSContextMap,
	ODSContextMapEdge,
	ODSContextMapNode,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import {
	type ContextNodeData,
	clusterHue,
	contextGraph,
} from "./context-graph";

function node(overrides: Partial<ODSContextMapNode> = {}): ODSContextMapNode {
	return { id: "#/boundedcontexts/x", name: "X", namespace: [], ...overrides };
}

function mapOf(
	nodes: ODSContextMapNode[],
	edges: ODSContextMapEdge[] = [],
): ODSContextMap {
	return {
		nodes: new Map(nodes.map((n) => [n.id, n])),
		edges: new Map(edges.map((e, i) => [`e${i}`, e])),
	} as unknown as ODSContextMap;
}

const edge = (overrides: Partial<ODSContextMapEdge>): ODSContextMapEdge => ({
	source: node({ id: "#/a" }),
	target: node({ id: "#/b" }),
	type: "upstream-downstream",
	upstreamRoles: [],
	downstreamRoles: [],
	implied: false,
	...overrides,
});

describe("contextGraph", () => {
	it("labels a nameless context with its ref", () => {
		const [n] = contextGraph(mapOf([node({ name: undefined })])).nodes;
		expect(n.label).toBe("#/boundedcontexts/x");
	});

	it("nests a group per namespace level, workspace included", () => {
		const g = contextGraph(
			mapOf([
				node({
					id: "#/a",
					namespace: [
						{ id: "w", name: "Workspace" },
						{ id: "d", name: "Domain" },
					],
				}),
				node({ id: "#/b", namespace: [{ id: "w", name: "Workspace" }] }),
			]),
		);
		expect(g.groups).toEqual([
			{ id: "cluster:w", label: "Workspace", parent: undefined },
			{ id: "cluster:d", label: "Domain", parent: "cluster:w" },
		]);
	});

	it("draws every context with the context node carrying team, mud flag, cluster and description", () => {
		const [n] = contextGraph(
			mapOf([
				node({
					namespace: [
						{ id: "w", name: "Workspace" },
						{ id: "d", name: "Domain" },
						{ id: "s", name: "Sub" },
					],
					team: { id: "#/teams/a", name: "Team A" },
					bigBallOfMud: true,
					description: "Legacy",
				}),
			]),
		).nodes;
		expect(n).toMatchObject({
			type: "context",
			label: "X",
			groupPath: "Domain / Sub",
			groupId: "cluster:s",
			cluster: "Domain",
			team: "Team A",
			bigBallOfMud: true,
			description: "Legacy",
			chips: ["Team A", "big ball of mud"],
			tone: "warn",
		});
	});
	it("leaves cluster, team and description unset when the context has none", () => {
		const [n] = contextGraph(mapOf([node()])).nodes as ContextNodeData[];
		expect(n).toMatchObject({ bigBallOfMud: false, tone: "", chips: [] });
		expect(n.cluster).toBeUndefined();
		expect(n.team).toBeUndefined();
		expect(n.description).toBeUndefined();
	});
	it("labels directed edges with the stereotype and role abbreviations at each end", () => {
		const [e] = contextGraph(
			mapOf(
				[node({ id: "#/a" }), node({ id: "#/b" })],
				[
					edge({
						type: "customer-supplier",
						upstreamRoles: ["open-host-service", "published-language"],
						downstreamRoles: ["anti-corruption-layer"],
						implied: true,
					}),
				],
			),
		).edges;
		expect(e).toMatchObject({
			type: "context",
			label: "C/S",
			sourceLabel: "OHS+PL",
			targetLabel: "ACL",
			dashed: true,
			directed: true,
		});
	});
	it("omits role labels when none are declared", () => {
		const [e] = contextGraph(
			mapOf([node({ id: "#/a" }), node({ id: "#/b" })], [edge({})]),
		).edges;
		expect(e.label).toBe("U/D");
		expect(e.sourceLabel).toBeUndefined();
		expect(e.targetLabel).toBeUndefined();
	});
	it("draws symmetric types without arrowhead or role labels", () => {
		const [e] = contextGraph(
			mapOf(
				[node({ id: "#/a" }), node({ id: "#/b" })],
				[
					edge({
						type: "shared-kernel",
						upstreamRoles: ["published-language"],
					}),
				],
			),
		).edges;
		expect(e).toMatchObject({ label: "SK", directed: false, dashed: false });
		expect(e.sourceLabel).toBeUndefined();
	});
	it("gives a cluster a stable hue within the colour wheel", () => {
		expect(clusterHue("Sales")).toBe(clusterHue("Sales"));
		expect(clusterHue("Sales")).not.toBe(clusterHue("Inventory"));
		for (const name of ["", "a", "Sales", "Petstore Commerce"]) {
			const h = clusterHue(name);
			expect(h).toBeGreaterThanOrEqual(0);
			expect(h).toBeLessThan(360);
		}
	});
});
