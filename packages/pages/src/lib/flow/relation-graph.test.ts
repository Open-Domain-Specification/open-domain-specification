import type {
	ODSRelationMap,
	ODSRelationMapEdge,
	ODSRelationMapNode,
} from "@open-domain-specification/core";
import { STEREOTYPES } from "@open-domain-specification/graphviz";
import { describe, expect, it } from "vitest";
import { relationEdgeType, relationGraph } from "./relation-graph";

function node(overrides: Partial<ODSRelationMapNode> = {}): ODSRelationMapNode {
	return {
		id: "#/x",
		name: "X",
		namespace: [],
		type: "entity",
		attributes: [],
		...overrides,
	};
}

function mapOf(
	nodes: ODSRelationMapNode[],
	edges: ODSRelationMapEdge[] = [],
): ODSRelationMap {
	return {
		nodes: new Map(nodes.map((n) => [n.id, n])),
		edges: new Map(edges.map((e, i) => [`e${i}`, e])),
	} as unknown as ODSRelationMap;
}

describe("relationGraph", () => {
	it("draws every node with the relation class box and its stereotype", () => {
		const [root, entity, vo] = relationGraph(
			mapOf([
				node({ id: "#/r", type: "entity_root" }),
				node({ id: "#/e", type: "entity" }),
				node({ id: "#/v", type: "valueobject" }),
			]),
		).nodes;
		expect([root.type, entity.type, vo.type]).toEqual([
			"relation",
			"relation",
			"relation",
		]);
		expect(root.chips).toEqual([STEREOTYPES.entity_root]);
		expect(root.tone).toBe("core");
		expect(entity.chips).toEqual(["entity"]);
		expect(entity.tone).toBe("");
		expect(vo.chips).toEqual(["value object"]);
		expect(vo.tone).toBe("muted");
		expect(vo.icon).not.toBe(entity.icon);
	});

	it("labels a nameless node with its ref", () => {
		const [n] = relationGraph(
			mapOf([node({ id: "#/nameless", name: undefined })]),
		).nodes;
		expect(n.label).toBe("#/nameless");
	});

	it("carries attributes with identity and the cluster path", () => {
		const [n] = relationGraph(
			mapOf([
				node({
					namespace: [
						{ id: "ws", name: "Workspace" },
						{ id: "bc", name: "Sales" },
						{ id: "agg", name: "Order" },
					],
					attributes: [
						{ name: "id", type: "string", identity: true, description: "d" },
						{ name: "total", type: "Money", identity: false },
					],
				}),
			]),
		).nodes;
		expect(n.groupPath).toBe("Sales / Order");
		expect(n.groupId).toBe("cluster:agg");
		expect(n.attributes).toEqual([
			{ name: "id", type: "string", identity: true },
			{ name: "total", type: "Money", identity: false },
		]);
	});

	it("groups nodes in one flat cluster per aggregate, labelled with its path below the workspace", () => {
		const ws = { id: "ws", name: "Workspace" };
		const order = { id: "order", name: "Order" };
		const g = relationGraph(
			mapOf([
				node({
					id: "#/a",
					namespace: [ws, { id: "bc", name: "Sales" }, order],
				}),
				node({
					id: "#/b",
					namespace: [ws, { id: "bc", name: "Sales" }, order],
				}),
				node({ id: "#/c", namespace: [{ id: "ship", name: "Shipment" }] }),
				node({ id: "#/d" }),
			]),
		);
		expect(g.groups).toEqual([
			{ id: "cluster:order", label: "Sales / Order" },
			{ id: "cluster:ship", label: "Shipment" },
		]);
		expect(g.nodes.map((n) => n.groupId)).toEqual([
			"cluster:order",
			"cluster:order",
			"cluster:ship",
			undefined,
		]);
	});

	it("types each edge by its relation and leaves styling to the edge component", () => {
		const a = node({ id: "#/a" });
		const b = node({ id: "#/b" });
		const edges = relationGraph(
			mapOf(
				[a, b],
				[
					{
						source: a,
						target: b,
						relation: "includes",
						label: "has",
						cardinality: "*",
					},
					{ source: a, target: b, relation: "uses", label: "" },
					{ source: a, target: b, relation: "references", label: "for" },
				],
			),
		).edges;
		expect(edges.map((e) => e.type)).toEqual([
			"relation-includes",
			"relation-uses",
			"relation-references",
		]);
		expect(edges[0]).toMatchObject({
			id: "e0",
			source: "#/a",
			target: "#/b",
			label: "has",
			// A composition: exactly one whole at the source, the cardinality at the part.
			sourceLabel: "1",
			targetLabel: "*",
			directed: false,
			dashed: false,
		});
		expect(edges[1].targetLabel).toBeUndefined();
		expect(edges[1].sourceLabel).toBeUndefined();
		expect(edges[2].sourceLabel).toBeUndefined();
		expect(relationEdgeType("uses")).toBe("relation-uses");
		expect(relationEdgeType("identifies")).toBe("relation-identifies");
	});
});
