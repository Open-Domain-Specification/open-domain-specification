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

/**
 * The rich fixture with the ordering/invoicing relationship taken back off, so
 * that the pair's two consumptions are all that joins them and the map has to
 * imply the edge.
 */
function withoutOrderingRelationship() {
	const f = makeRichTestWs();
	f.ws.relationships = f.ws.relationships.filter(
		(r) => r !== f.orderingSuppliesInvoicing,
	);
	return f;
}

describe("ODSContextMap", () => {
	const f = makeRichTestWs();

	it("has a node for every context in scope, even ones with no consumptions", () => {
		const map = ODSContextMap.fromWorkspace(f.ws);
		expect(Array.from(map.nodes.keys()).sort()).toEqual(
			[f.orderingBc.ref, f.invoicingBc.ref, f.reportingBc.ref].sort(),
		);
	});

	it("draws one implied upstream/downstream edge per consuming pair, merging roles", () => {
		const map = ODSContextMap.fromWorkspace(withoutOrderingRelationship().ws);
		const implied = Array.from(map.edges.values()).filter((e) => e.implied);
		expect(implied).toHaveLength(1);
		expect(implied[0].implied).toBe("consumption");
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
		expect(declared.map((e) => e.type).sort()).toEqual([
			"partnership",
			"upstream-downstream",
		]);
		expect(declared.find((e) => e.type === "partnership")?.description).toBe(
			"Reporting and ordering plan releases together",
		);
	});

	it("suppresses the implied edge when the pair has a declared relationship", () => {
		const { ws, orderingBc, invoicingBc } = withoutOrderingRelationship();
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

	it("implies an edge from an identity into another context, with no roles", () => {
		// Two contexts joined by nothing but Holder's Thing Id (decision 14).
		const ws = new Workspace("W", {
			odsVersion: "1.0.0",
			description: "",
			version: "0",
		});
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const thing = up
			.addAggregate("Thing", { description: "" })
			.addRootEntity("Thing", { description: "" });
		down
			.addAggregate("Holder", { description: "" })
			.addRootEntity("Holder", { description: "" })
			.addAttribute("Thing Id", { type: "uuid", identifies: thing });
		const edges = Array.from(ODSContextMap.fromWorkspace(ws).edges.values());
		expect(edges).toHaveLength(1);
		// The context holding the identity is the downstream end: it is the one
		// shaped by the other's model.
		expect(edges[0].source.id).toBe(up.ref);
		expect(edges[0].target.id).toBe(down.ref);
		expect(edges[0].implied).toBe("identity");
		expect(edges[0].upstreamRoles).toEqual([]);
		expect(edges[0].downstreamRoles).toEqual([]);
	});

	it("leaves the consumption edge in place when an identity runs the same way", () => {
		// The identity travels on the traffic the consumption edge stands for, so
		// that edge — which also carries the roles — is the one to keep.
		const { ws, orderingBc, invoicingBc } = withoutOrderingRelationship();
		const order = orderingBc.aggregates.get("order");
		const invoice = invoicingBc.aggregates.get("invoice");
		const root = order && [...order.entities.values()].find((e) => e.root);
		const holder =
			invoice && [...invoice.entities.values()].find((e) => e.root);
		if (!root || !holder) throw new Error("fixture changed");
		holder.addAttribute("Order Id", { type: "uuid", identifies: root });
		const edges = Array.from(ODSContextMap.fromWorkspace(ws).edges.values());
		expect(edges.filter((e) => e.implied === "identity")).toEqual([]);
		expect(edges.filter((e) => e.implied === "consumption")).toHaveLength(1);
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
		expect(map.edges.size).toBe(4);
	});

	/** The edge for Invoicing's consumption of Ordering's Order Placed. */
	const orderPlacedEdge = () => {
		const map = ODSConsumableMap.fromService(f.invoiceApp);
		const edge = Array.from(map.edges.values()).find(
			(it) => it.by.length > 0 || it.sourcePattern === "conformist",
		);
		if (!edge) throw new Error("Order Placed is not consumed");
		return edge;
	};

	it("carries both patterns on the edge", () => {
		const edge = orderPlacedEdge();
		expect(edge.sourcePattern).toBe("conformist");
		expect(edge.targetPattern).toBe("published-language");
	});

	it("names what makes the consumption on the edge, and nothing when it is the whole consumer", () => {
		expect(orderPlacedEdge().by).toEqual(["Invoice on order placed"]);
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

	it("draws a kind as a generalisation pointing at what it is a kind of", () => {
		const ws = new Workspace("Kinds", {
			odsVersion: "1.0.0",
			description: "",
			version: "1.0.0",
		});
		const bc = ws.addBoundedContext("Catalogue", { description: "" });
		const agg = bc.addAggregate("Title", { description: "" });
		const title = agg.addRootEntity("Title", { description: "" });
		title.addAttribute("titleId", { type: "string", identity: true });
		agg.addEntity("Series", { description: "", specialises: title });
		const ledger = bc.addValueObject("Ledger Account", { description: "" });
		bc.addValueObject("Nominal Account", {
			description: "",
			specialises: ledger,
		});

		const graph = ODSRelationGraph.fromWorkspace(ws);
		expect(graph.subtypes.map((it) => it.name)).toEqual([
			"Nominal Account",
			"Series",
		]);
		const edges = Array.from(
			ODSRelationMap.fromGraph(graph).edges.values(),
		).filter((e) => e.relation === "specialises");
		expect(edges.map((e) => [e.source.name, e.target.name, e.label])).toEqual([
			["Nominal Account", "Ledger Account", ""],
			["Series", "Title", ""],
		]);
		// A generalisation carries no multiplicity: it is not a "how many".
		expect(edges.every((e) => e.cardinality === undefined)).toBe(true);
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
		// The walk starts at what wakes the policy and follows the chain, so the
		// edges come out in the order a reader would trace them.
		expect(edges).toEqual([
			"Order Placed -> Invoice on order placed",
			"Invoice on order placed -> Raise Invoice",
			"Raise Invoice -> Invoice Raised",
			"Invoice Raised -> Invoice to customer",
			"Invoice to customer -> Send Invoice",
			"Send Invoice -> Invoice Sent",
			"Invoice to customer -> Invoice Sent",
		]);
	});

	it("draws a process with what starts it coming in and what ends it going out", () => {
		const map = ODSFlowMap.fromBoundedContext(f.invoicingBc);
		expect(map.nodes.get(f.invoiceToCustomer.ref)?.type).toBe("process");
		const from = (ref: string) =>
			Array.from(map.edges.values())
				.filter((e) => e.source.id === ref)
				.map((e) => e.target.name);
		const into = (ref: string) =>
			Array.from(map.edges.values())
				.filter((e) => e.target.id === ref)
				.map((e) => e.source.name);
		expect(into(f.invoiceToCustomer.ref)).toEqual(["Invoice Raised"]);
		// What it issues, and the fact that completes an instance: the ending
		// event is drawn from the process and never walked back into it, which is
		// why the normal shape is no cycle (decision 23).
		expect(from(f.invoiceToCustomer.ref)).toEqual([
			"Send Invoice",
			"Invoice Sent",
		]);
	});

	it("leaves out operations no policy or process issues", () => {
		const map = ODSFlowMap.fromWorkspace(f.ws);
		expect(map.nodes.has(f.placeOrder.ref)).toBe(false);
		expect(map.nodes.size).toBe(7);
	});

	it("follows a consumption's by out of the context and on from what it raises", () => {
		// Decision 17's shape: the policy issues its own context's operation, and
		// that operation is what calls out. `by` says so, so the flow map carries
		// on through it instead of stopping at the boundary.
		const ws = new Workspace("Across", {
			odsVersion: "1.0.0",
			description: "",
			version: "1.0.0",
		});
		const shipping = ws.addBoundedContext("Shipping", { description: "" });
		const shippingApp = shipping.addService("Shipping App", {
			description: "",
			type: "application",
		});
		const dispatched = shippingApp.provides("Dispatched", {
			description: "",
			type: "event",
		});
		const dispatch = shippingApp
			.provides("Dispatch", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(dispatched);
		const ordering = ws.addBoundedContext("Ordering", { description: "" });
		const orderApp = ordering.addService("Order App", {
			description: "",
			type: "application",
		});
		const paid = orderApp.provides("Paid", { description: "", type: "event" });
		const askToDispatch = orderApp.provides("Ask To Dispatch", {
			description: "",
			type: "operation",
		});
		orderApp.consumes(dispatch, {
			pattern: "conformist",
			by: [askToDispatch],
		});
		ordering
			.addPolicy("On paid", { description: "" })
			.on(paid)
			.then(askToDispatch);

		const map = ODSFlowMap.fromWorkspace(ws);
		expect(
			Array.from(map.edges.values()).map(
				(e) => `${e.source.name} -> ${e.target.name}`,
			),
		).toEqual([
			"Paid -> On paid",
			"On paid -> Ask To Dispatch",
			"Ask To Dispatch -> Dispatch",
			"Dispatch -> Dispatched",
		]);
		// The far side's operation clusters under the service that provides it.
		expect(map.nodes.get(dispatch.ref)?.namespace.slice(-1)[0]?.id).toBe(
			shippingApp.ref,
		);
	});
});
