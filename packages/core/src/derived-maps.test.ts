import { describe, expect, it } from "vitest";
import { ODSConsumableMap } from "./consumable-map";
import { ODSConsumptionGraph } from "./consumption-graph";
import { ODSContextMap } from "./context-map";
import { ODSFlowMap } from "./flow-map";
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

	it("has a node for every context in scope, even ones with no consumptions", () => {
		const map = ODSContextMap.fromWorkspace(f.ws);
		expect(Array.from(map.nodes.keys()).sort()).toEqual(
			[f.orderingBc.ref, f.invoicingBc.ref, f.reportingBc.ref].sort(),
		);
	});

	it("draws one implied upstream/downstream edge per consuming pair, merging roles", () => {
		const map = ODSContextMap.fromWorkspace(f.ws);
		const implied = Array.from(map.edges.values()).filter((e) => e.implied);
		expect(implied).toHaveLength(1);
		const [edge] = implied;
		expect(edge.source.id).toBe(f.orderingBc.ref);
		expect(edge.target.id).toBe(f.invoicingBc.ref);
		expect(edge.type).toBe("upstream-downstream");
		expect(edge.upstreamRoles.sort()).toEqual([
			"open-host-service",
			"published-language",
		]);
		expect(edge.downstreamRoles.sort()).toEqual([
			"anti-corruption-layer",
			"conformist",
		]);
	});

	it("draws declared relationships as-is", () => {
		const map = ODSContextMap.fromWorkspace(f.ws);
		const declared = Array.from(map.edges.values()).filter((e) => !e.implied);
		expect(declared).toHaveLength(1);
		expect(declared[0].type).toBe("partnership");
		expect(declared[0].description).toBe(
			"Reporting and ordering plan releases together",
		);
	});

	it("suppresses the implied edge when the pair has a declared relationship", () => {
		const { ws, orderingBc, invoicingBc } = makeRichTestWs();
		invoicingBc.downstreamOf(orderingBc, {
			type: "customer-supplier",
			upstreamRoles: ["open-host-service"],
		});
		const map = ODSContextMap.fromWorkspace(ws);
		const edges = Array.from(map.edges.values());
		expect(edges.filter((e) => e.implied)).toHaveLength(0);
		expect(edges.find((e) => e.type === "customer-supplier")?.source.id).toBe(
			orderingBc.ref,
		);
	});

	it("nests nodes under workspace, domain and subdomain namespaces", () => {
		const map = ODSContextMap.fromWorkspace(f.ws);
		const node = map.nodes.get(f.orderingBc.ref);
		expect(node?.namespace.map((n) => n.id)).toEqual([
			f.ws.id,
			f.sales.ref,
			f.ordering.ref,
		]);
		expect(map.nodes.get(f.reportingBc.ref)?.namespace).toEqual([
			{ id: f.ws.id, name: f.ws.name },
		]);
	});

	it("carries the owning team on the node", () => {
		const map = ODSContextMap.fromWorkspace(f.ws);
		expect(map.nodes.get(f.orderingBc.ref)?.team).toEqual({
			id: f.salesTeam.ref,
			name: "Sales Team",
		});
		expect(map.nodes.get(f.reportingBc.ref)?.team).toBeUndefined();
	});

	it("flags big-ball-of-mud contexts on their node", () => {
		const map = ODSContextMap.fromWorkspace(f.ws);
		expect(map.nodes.get(f.reportingBc.ref)?.bigBallOfMud).toBe(true);
		expect(map.nodes.get(f.orderingBc.ref)?.bigBallOfMud).toBe(false);
	});

	it("scoped to one context, shows that context and its neighbours", () => {
		const map = ODSContextMap.fromBoundedContext(f.orderingBc);
		expect(Array.from(map.nodes.keys()).sort()).toEqual(
			[f.orderingBc.ref, f.invoicingBc.ref, f.reportingBc.ref].sort(),
		);
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

	it("carries cardinality on relation edges", () => {
		const map = ODSRelationMap.fromWorkspace(f.ws);
		const cardinalities = Array.from(map.edges.values()).map(
			(e) => `${e.source.name} -> ${e.target.name}: ${e.cardinality ?? "-"}`,
		);
		expect(cardinalities).toContain("Order -> Order Line: 1..*");
		expect(cardinalities).toContain("Invoice -> Order: -");
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

describe("ODSFlowMap", () => {
	const f = makeRichTestWs();

	it("joins events, policies and commands, following what commands raise", () => {
		const map = ODSFlowMap.fromBoundedContext(f.invoicingBc);
		expect(map.nodes.get(f.orderPlacedEvent.ref)?.type).toBe("event");
		expect(map.nodes.get(f.invoiceOnOrderPlaced.ref)?.type).toBe("policy");
		expect(map.nodes.get(f.raiseInvoiceCommand.ref)?.type).toBe("command");
		const edges = Array.from(map.edges.values()).map(
			(e) => `${e.source.name} -> ${e.target.name}`,
		);
		expect(edges).toEqual([
			"Order Placed -> Invoice on order placed",
			"Raise Invoice -> Invoice Raised",
			"Invoice on order placed -> Raise Invoice",
		]);
	});

	it("leaves out commands no policy issues", () => {
		const map = ODSFlowMap.fromWorkspace(f.ws);
		expect(map.nodes.has(f.placeOrderCommand.ref)).toBe(false);
		expect(map.nodes.size).toBe(4);
	});
});
