import {
	ODSConsumableMap,
	ODSContextMap,
	ODSRelationMap,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { petstoreModel } from "../fixtures";
import type { ConsumableNodeData } from "./consumable-graph";
import type { ContextNodeData } from "./context-graph";
import { consumableGraph, contextGraph, relationGraph } from "./graph";
import { legendEntries } from "./legend";

const { workspace } = petstoreModel();
const sales = workspace.boundedcontexts.get("sales_bc")!;
const order = sales.aggregates.get("order")!;
const marks = (entries: { mark: string }[]) => entries.map((e) => e.mark);

describe("legendEntries for the context map", () => {
	it("lists the stereotypes, roles and marks the petstore map shows, with full names", () => {
		const graph = contextGraph(ODSContextMap.fromWorkspace(workspace));
		const entries = legendEntries(graph, "context");
		const byMark = new Map(entries.map((e) => [e.mark, e.name]));
		expect(byMark.get("U/D")).toBe("Upstream/downstream");
		expect(byMark.get("OHS")).toBe("Open host service");
		expect(byMark.get("ACL")).toBe("Anti-corruption layer");
		expect(byMark.get("band")).toBe("Domain colour");
		// Every stereotype and role listed is on an edge of the map.
		const onEdges = new Set(
			graph.edges.flatMap((e) => [
				e.label,
				...(e.sourceLabel?.split("+") ?? []),
				...(e.targetLabel?.split("+") ?? []),
			]),
		);
		for (const e of entries)
			if (/^[A-Z/]+$/.test(e.mark)) expect(onEdges.has(e.mark)).toBe(true);
	});
	it("lists nothing the graph does not draw", () => {
		const bare = legendEntries(
			{
				nodes: [
					{
						id: "#/a",
						type: "context",
						label: "A",
						icon: "x",
						bigBallOfMud: false,
					},
					{
						id: "#/b",
						type: "context",
						label: "B",
						icon: "x",
						bigBallOfMud: false,
					},
				] as ContextNodeData[],
				edges: [{ id: "e", type: "context", source: "#/a", target: "#/b" }],
			},
			"context",
		);
		expect(bare).toEqual([]);
		const full = legendEntries(
			{
				nodes: [
					{
						id: "#/a",
						type: "context",
						label: "A",
						icon: "x",
						bigBallOfMud: true,
						cluster: "Commerce",
					},
				] as ContextNodeData[],
				edges: [
					{
						id: "e",
						type: "context",
						source: "#/a",
						target: "#/a",
						label: "SK",
						dashed: true,
						sourceLabel: "OHS+PL",
						targetLabel: "CF+???",
					},
				],
			},
			"context",
		);
		expect(marks(full)).toEqual([
			"SK",
			"OHS",
			"PL",
			"CF",
			"dashed",
			"dashed octagon",
			"band",
		]);
		expect(full.find((e) => e.mark === "SK")?.name).toBe("Shared kernel");
		expect(full.find((e) => e.mark === "dashed")?.name).toBe(
			"Implied relationship",
		);
	});
});

describe("legendEntries for the consumable map", () => {
	it("names lollipops, sockets, connectors and the patterns in use", () => {
		const graph = consumableGraph(ODSConsumableMap.fromBoundedContext(sales));
		const entries = legendEntries(graph, "consumable");
		expect(marks(entries).slice(0, 3)).toEqual(["lollipop", "socket", "line"]);
		expect(entries.find((e) => e.mark === "line")?.name).toBe(
			"Assembly connector",
		);
		expect(marks(entries)).toContain("OHS");
		expect(marks(entries)).toContain("CF");
	});
	it("omits what a single provider without consumers has no use for", () => {
		const entries = legendEntries(
			{
				nodes: [
					{
						id: "#/p",
						type: "consumable",
						label: "P",
						icon: "x",
						slots: [{ id: "#/p/provides/x", name: "X", kind: "event" }],
						requires: [],
					},
				] as ConsumableNodeData[],
				edges: [],
			},
			"consumable",
		);
		expect(entries).toEqual([{ mark: "lollipop", name: "Provided interface" }]);
		const withPattern = legendEntries(
			{
				nodes: [
					{
						id: "#/p",
						type: "consumable",
						label: "P",
						icon: "x",
						slots: [],
						requires: [{ id: "#/x", name: "X", pattern: "conformist" }],
					},
				] as ConsumableNodeData[],
				edges: [
					{
						id: "e",
						type: "consumable",
						source: "#/p",
						target: "#/p",
						sourceLabel: "conformist",
						targetLabel: "published-language",
					},
				],
			},
			"consumable",
		);
		expect(marks(withPattern)).toEqual(["socket", "line", "CF", "PL"]);
	});
});

describe("legendEntries for the relation map", () => {
	it("names the connectors and multiplicities the aggregate's relations use", () => {
		const graph = relationGraph(ODSRelationMap.fromAggregate(order));
		const entries = legendEntries(graph, "relation");
		const kinds = new Set(graph.edges.map((e) => e.type));
		expect(marks(entries).includes("filled diamond")).toBe(
			kinds.has("relation-includes"),
		);
		expect(marks(entries).includes("open arrow")).toBe(
			kinds.has("relation-references"),
		);
		expect(marks(entries).includes("dashed")).toBe(kinds.has("relation-uses"));
		expect(marks(entries)).toContain("1, *, 0..1");
	});
	it("is empty for classes with no relations", () => {
		expect(
			legendEntries(
				{
					nodes: [{ id: "#/a", type: "relation", label: "A", icon: "x" }],
					edges: [],
				},
				"relation",
			),
		).toEqual([]);
		const all = legendEntries(
			{
				nodes: [],
				edges: [
					{ id: "a", type: "relation-includes", source: "#/a", target: "#/b" },
					{
						id: "b",
						type: "relation-references",
						source: "#/a",
						target: "#/b",
					},
					{ id: "c", type: "relation-uses", source: "#/a", target: "#/b" },
				],
			},
			"relation",
		);
		expect(marks(all)).toEqual(["filled diamond", "open arrow", "dashed"]);
	});
});
