import { describe, expect, it } from "vitest";
import { ODSConsumableMap } from "./consumable-map";
import { ODSConsumptionGraph } from "./consumption-graph";
import { ODSContextMap } from "./context-map";
import { ODSFlowMap } from "./flow-map";
import { makeRichTestWs } from "./makeTestWs";
import { ODSRelationGraph, ODSRelationMap } from "./relation-map";
import { Workspace } from "./workspace";

describe("ODSConsumptionGraph", () => {
	const f = makeRichTestWs();

	it("collects every consumption from the workspace root", () => {
		const graph = ODSConsumptionGraph.fromWorkspace(f.ws);
		expect(graph.consumptions).toHaveLength(4);
		expect(graph.consumptions).toContain(f.invoiceConsumesOrderPlaced);
		expect(graph.consumptions).toContain(f.invoiceAppConsumesPlaceOrder);
		expect(graph.consumptions).toContain(f.reportingConsumesOrderPlaced);
		expect(graph.consumptions).toContain(f.orderAppConsumesSalesFigures);
	});

	it("follows consumptions outward from a consumer scope", () => {
		// Invoicing's own two, and then onward: the walk follows the providers it
		// reaches, so ordering's two consumptions come with them.
		const graph = ODSConsumptionGraph.fromBoundedContext(f.invoicingBc);
		expect(graph.consumptions).toHaveLength(4);
	});

	it("only includes consumptions whose provider is in scope when starting from the provider", () => {
		// Both consumptions of the Order aggregate's own Order Placed event, and
		// nothing Ordering's application service consumes from elsewhere.
		const graph = ODSConsumptionGraph.fromAggregate(f.orderAgg);
		expect(graph.consumptions).toEqual([
			f.invoiceConsumesOrderPlaced,
			f.reportingConsumesOrderPlaced,
		]);
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
		expect(map.nodes.size).toBe(5);
		expect(map.edges.size).toBe(4);
	});

	it("carries both patterns on the edge", () => {
		const map = ODSConsumableMap.fromAggregate(f.invoiceAgg);
		const [edge] = Array.from(map.edges.values());
		expect(edge.sourcePattern).toBe("conformist");
		expect(edge.targetPattern).toBe("published-language");
	});

	it("names what makes the consumption on the edge, and nothing when it is the whole consumer", () => {
		const map = ODSConsumableMap.fromAggregate(f.invoiceAgg);
		const [edge] = Array.from(map.edges.values());
		expect(edge.by).toEqual(["Invoice on order placed"]);
		const whole = ODSConsumableMap.fromService(f.reportingApp);
		expect(Array.from(whole.edges.values()).map((it) => it.by)).toContainEqual(
			[],
		);
	});
});

describe("ODSRelationMap", () => {
	const f = makeRichTestWs();

	it("collects all relations reachable from the workspace", () => {
		expect(ODSRelationGraph.fromWorkspace(f.ws).relations).toHaveLength(4);
	});

	it("carries cardinality on relation edges", () => {
		const map = ODSRelationMap.fromWorkspace(f.ws);
		const cardinalities = Array.from(map.edges.values()).map(
			(e) => `${e.source.name} -> ${e.target.name}: ${e.cardinality ?? "-"}`,
		);
		expect(cardinalities).toContain("Order -> Order Line: 1..*");
		expect(cardinalities).toContain("Basket -> Order: -");
	});

	it("types nodes as root entity, entity or value object", () => {
		const map = ODSRelationMap.fromWorkspace(f.ws);
		expect(map.nodes.get(f.order.ref)?.type).toBe("entity_root");
		expect(map.nodes.get(f.orderLine.ref)?.type).toBe("entity");
		expect(map.nodes.get(f.money.ref)?.type).toBe("valueobject");
	});

	it("carries an attribute's optional flag onto its node", () => {
		const map = ODSRelationMap.fromWorkspace(f.ws);
		const attributes = map.nodes.get(f.order.ref)?.attributes ?? [];
		expect(attributes.find((a) => a.name === "Note")?.optional).toBe(true);
		expect(attributes.find((a) => a.name === "Order Id")?.optional).toBe(false);
	});

	it("draws an identity attribute as an edge to the entity it identifies", () => {
		const map = ODSRelationMap.fromBoundedContext(f.invoicingBc);
		const edge = Array.from(map.edges.values()).find(
			(e) => e.relation === "identifies",
		);
		expect(edge?.source.name).toBe("Invoice");
		expect(edge?.target.name).toBe("Order");
		expect(edge?.label).toBe("Order Id");
		// The root it names is another context's, and the map reaches it anyway:
		// that is the one dependency allowed to cross (decision 14).
		expect(map.nodes.get(f.order.ref)?.type).toBe("entity_root");
	});

	it("draws an identity of a child entity onto the child, in its own cluster", () => {
		const ws = new Workspace("Child identity", {
			odsVersion: "1.0.0",
			description: "",
			version: "1.0.0",
		});
		const playback = ws.addBoundedContext("Playback", { description: "" });
		const sessionAgg = playback.addAggregate("Session", { description: "" });
		const session = sessionAgg.addRootEntity("Session", { description: "" });
		session.addAttribute("id", { type: "string", identity: true });
		const identity = ws.addBoundedContext("Identity", { description: "" });
		const householdAgg = identity.addAggregate("Household", {
			description: "",
		});
		const household = householdAgg.addRootEntity("Household", {
			description: "",
		});
		household.addAttribute("id", { type: "string", identity: true });
		const profile = householdAgg.addEntity("Profile", { description: "" });
		profile.addAttribute("profileId", { type: "string", identity: true });
		household.includes(profile, "has profiles", "1..*");
		session.addAttribute("profileId", { type: "string", identifies: profile });

		const map = ODSRelationMap.fromWorkspace(ws);
		const edge = Array.from(map.edges.values()).find(
			(e) => e.relation === "identifies",
		);
		expect(edge?.source.name).toBe("Session");
		// The edge lands on the child itself, not on the root standing in for it.
		expect(edge?.target.name).toBe("Profile");
		const child = map.nodes.get(profile.ref);
		expect(child?.type).toBe("entity");
		// And the child sits in its own aggregate's cluster, beside the root it
		// is reached through, which is what makes the dependency readable.
		expect(child?.namespace[child.namespace.length - 1]?.id).toBe(
			householdAgg.ref,
		);
		expect(map.nodes.get(household.ref)?.type).toBe("entity_root");
	});

	it("collects the identity attributes in scope and no others", () => {
		expect(
			ODSRelationGraph.fromBoundedContext(f.invoicingBc).identities.map(
				(a) => a.name,
			),
		).toEqual(["Order Id"]);
		expect(
			ODSRelationGraph.fromBoundedContext(f.orderingBc).identities,
		).toEqual([]);
	});

	it("follows cross-aggregate relations transitively and namespaces targets by their own aggregate", () => {
		const map = ODSRelationMap.fromAggregate(f.basketAgg);
		const target = map.nodes.get(f.order.ref);
		expect(target?.namespace[target.namespace.length - 1]?.id).toBe(
			f.orderAgg.ref,
		);
		// basket -> order, then order -> line, order -> money and line -> money
		expect(map.edges.size).toBe(4);
	});
});

describe("ODSFlowMap", () => {
	const f = makeRichTestWs();

	it("joins event consumables, policies and operations, following what operations raise", () => {
		const map = ODSFlowMap.fromBoundedContext(f.invoicingBc);
		expect(map.nodes.get(f.orderPlaced.ref)?.type).toBe("event");
		expect(map.nodes.get(f.invoiceOnOrderPlaced.ref)?.type).toBe("policy");
		expect(map.nodes.get(f.raiseInvoice.ref)?.type).toBe("command");
		const edges = Array.from(map.edges.values()).map(
			(e) => `${e.source.name} -> ${e.target.name}`,
		);
		expect(edges).toEqual([
			"Order Placed -> Invoice on order placed",
			"Raise Invoice -> Invoice Raised",
			"Invoice on order placed -> Raise Invoice",
		]);
	});

	it("leaves out operations no policy issues", () => {
		const map = ODSFlowMap.fromWorkspace(f.ws);
		expect(map.nodes.has(f.placeOrder.ref)).toBe(false);
		expect(map.nodes.size).toBe(4);
	});
});
