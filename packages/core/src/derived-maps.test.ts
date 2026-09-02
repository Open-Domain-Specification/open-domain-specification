import { describe, expect, it } from "vitest";
import { ODSConsumableMap } from "./consumable-map";
import { ODSConsumptionGraph } from "./consumption-graph";
import { ODSContextMap } from "./context-map";
import { makeRichTestWs } from "./makeTestWs";
import { ODSRelationGraph, ODSRelationMap } from "./relation-map";

describe("ODSConsumptionGraph", () => {
	const f = makeRichTestWs();

	it("collects every consumption from the workspace root", () => {
		const graph = ODSConsumptionGraph.fromWorkspace(f.ws);
		expect(graph.consumptions).toHaveLength(2);
		expect(graph.consumptions).toContain(f.invoiceConsumesOrderPlaced);
		expect(graph.consumptions).toContain(f.invoiceAppConsumesPlaceOrder);
	});

	it("follows consumptions outward from a consumer scope", () => {
		const graph = ODSConsumptionGraph.fromBoundedContext(f.invoicingBc);
		expect(graph.consumptions).toHaveLength(2);
	});

	it("only includes consumptions whose provider is in scope when starting from the provider", () => {
		const graph = ODSConsumptionGraph.fromAggregate(f.orderAgg);
		expect(graph.consumptions).toEqual([f.invoiceConsumesOrderPlaced]);
	});
});

describe("ODSContextMap", () => {
	const f = makeRichTestWs();

	it("has one node per bounded context and one edge per consuming pair, provider as source", () => {
		const map = ODSContextMap.fromWorkspace(f.ws);
		expect(Array.from(map.nodes.keys()).sort()).toEqual(
			[f.orderingBc.ref, f.invoicingBc.ref].sort(),
		);
		expect(map.edges.size).toBe(2);
		for (const edge of map.edges.values()) {
			expect(edge.source.id).toBe(f.orderingBc.ref);
			expect(edge.target.id).toBe(f.invoicingBc.ref);
		}
	});

	it("nests nodes under workspace, domain and subdomain namespaces", () => {
		const map = ODSContextMap.fromWorkspace(f.ws);
		const node = map.nodes.get(f.orderingBc.ref);
		expect(node?.namespace.map((n) => n.id)).toEqual([
			f.ws.id,
			f.sales.ref,
			f.ordering.ref,
		]);
	});

	it("includes inbound consumptions when scoped to the provider context", () => {
		const map = ODSContextMap.fromBoundedContext(f.orderingBc);
		expect(map.nodes.size).toBe(2);
		expect(map.edges.size).toBe(2);
	});
});

describe("ODSConsumableMap", () => {
	const f = makeRichTestWs();

	it("creates a slot per consumable under its provider node", () => {
		const map = ODSConsumableMap.fromWorkspace(f.ws);
		expect(map.slots.get(f.orderPlaced.ref)?.node.id).toBe(f.orderAgg.ref);
		expect(map.slots.get(f.placeOrder.ref)?.node.id).toBe(f.orderApp.ref);
		expect(map.nodes.size).toBe(4);
		expect(map.edges.size).toBe(2);
	});

	it("carries both patterns on the edge", () => {
		const map = ODSConsumableMap.fromAggregate(f.invoiceAgg);
		const [edge] = Array.from(map.edges.values());
		expect(edge.sourcePattern).toBe("conformist");
		expect(edge.targetPattern).toBe("published-language");
	});
});

describe("ODSRelationMap", () => {
	const f = makeRichTestWs();

	it("collects all relations reachable from the workspace", () => {
		expect(ODSRelationGraph.fromWorkspace(f.ws).relations).toHaveLength(3);
	});

	it("types nodes as root entity, entity or value object", () => {
		const map = ODSRelationMap.fromWorkspace(f.ws);
		expect(map.nodes.get(f.order.ref)?.type).toBe("entity_root");
		expect(map.nodes.get(f.orderLine.ref)?.type).toBe("entity");
		expect(map.nodes.get(f.money.ref)?.type).toBe("valueobject");
	});

	it("follows cross-aggregate relations transitively and namespaces targets by their own aggregate", () => {
		const map = ODSRelationMap.fromAggregate(f.invoiceAgg);
		const target = map.nodes.get(f.order.ref);
		expect(target?.namespace[target.namespace.length - 1]?.id).toBe(
			f.orderAgg.ref,
		);
		// invoice -> order, then order -> line -> money are followed
		expect(map.edges.size).toBe(3);
	});
});
