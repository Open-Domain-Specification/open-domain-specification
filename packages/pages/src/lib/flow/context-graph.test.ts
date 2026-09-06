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
						implied: "consumption",
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
	it("stereotypes an edge implied by an identity «id» rather than U/D", () => {
		const [e] = contextGraph(
			mapOf(
				[node({ id: "#/a" }), node({ id: "#/b" })],
				[edge({ implied: "identity" })],
			),
		).edges;
		expect(e).toMatchObject({
			label: "«id»",
			dashed: true,
			directed: true,
			impliedBy: "identity",
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
	it("carries the declared relationship behind an edge, whichever way round the map drew it", () => {
		const relationships = [
			{ source: { ref: "#/b" }, target: { ref: "#/a" } },
		] as unknown as Parameters<typeof contextGraph>[1];
		const [e] = contextGraph(
			mapOf(
				[node({ id: "#/a" }), node({ id: "#/b" })],
				[edge({ type: "shared-kernel" })],
			),
			relationships,
		).edges;
		expect(e.intent).toBe(relationships?.[0]);
	});
	// One pair may hold two agreements in one direction, each with its own
	// disposition, so the edge and the intent are matched on the name as well
	// as the pair (decision 15, card 103).
	it("matches each of a pair's two agreements to its own intent", () => {
		const relationships = [
			{
				source: { ref: "#/a" },
				target: { ref: "#/b" },
				name: "Fulfilment API",
			},
			{ source: { ref: "#/a" }, target: { ref: "#/b" }, name: "Legacy Feed" },
		] as unknown as Parameters<typeof contextGraph>[1];
		const edges = contextGraph(
			mapOf(
				[node({ id: "#/a" }), node({ id: "#/b" })],
				[edge({ name: "Fulfilment API" }), edge({ name: "Legacy Feed" })],
			),
			relationships,
		).edges;
		expect(edges.map((e) => e.name)).toEqual(["Fulfilment API", "Legacy Feed"]);
		expect(edges[0].intent).toBe(relationships?.[0]);
		expect(edges[1].intent).toBe(relationships?.[1]);
	});
	it("leaves an implied edge and an unknown pair without an intent to mark", () => {
		const relationships = [
			{ source: { ref: "#/a" }, target: { ref: "#/b" } },
		] as unknown as Parameters<typeof contextGraph>[1];
		const nodes = [node({ id: "#/a" }), node({ id: "#/b" })];
		const [implied] = contextGraph(
			mapOf(nodes, [edge({ implied: "consumption" })]),
			relationships,
		).edges;
		expect(implied.intent).toBeUndefined();
		// Nothing declared about this pair: the edge draws as it always has.
		const [unknown] = contextGraph(mapOf(nodes, [edge({})])).edges;
		expect(unknown.intent).toBeUndefined();
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
