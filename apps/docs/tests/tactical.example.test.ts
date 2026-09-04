import { ODSFlowMap, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";

const ws = new Workspace("eCommerce", {
	odsVersion: "1.0.0",
	description: "Tactical design example",
	version: "0.1.0",
});
const ordering = ws.addBoundedContext("Ordering", { description: "" });
const order = ordering.addAggregate("Order", { description: "A purchase" });

// A value object belongs to the bounded context: every aggregate of the
// context may hold one. Entities and value objects carry typed attributes;
// identity attributes identify an entity and an attribute may point at the
// value object that models its type.
const money = ordering.addValueObject("Money", {
	description: "Amount + currency",
});
money.addAttribute("amount", { type: "decimal" });
money.addAttribute("currency", { type: "ISO 4217" });

const orderRoot = order.addRootEntity("Order", { description: "Order header" });
orderRoot.addAttribute("id", { type: "OrderId", identity: true });
orderRoot.addAttribute("total", { type: "Money", valueobject: money });

const line = order.addEntity("Order Line", { description: "One item" });
orderRoot.includes(line, "has lines", "1..*"); // relations may carry a cardinality

// Invariants say what they constrain.
const nonEmpty = order
	.addInvariant("Non-empty", { description: "An order has at least one line" })
	.constrains(line);

// A context declares the payload shapes of its messages once, as schemas, and
// a schema may name another as the type of one of its attributes.
const lineSummary = ordering.addSchema("Line Summary", {
	description: "One line, as the outside world sees it",
});
lineSummary.addAttribute("sku", { type: "SKU", identity: true });
const orderSummary = ordering.addSchema("Order Summary", {
	description: "What the outside world learns about an order",
});
orderSummary.addAttribute("orderId", { type: "OrderId", identity: true });
orderSummary.addAttribute("total", { type: "Money", valueobject: money });
orderSummary.addAttribute("lines", {
	type: "LineSummary[]",
	schema: lineSummary,
});

// An aggregate provides event consumables; an operation consumable lists the
// events it raises. Both may point at a schema.
const placed = order.provides("Order Placed", {
	description: "An order was placed",
	type: "event",
	pattern: "published-language",
	schema: orderSummary,
});
ordering
	.addService("Checkout", { description: "", type: "application" })
	.provides("Place Order", {
		description: "POST /orders",
		type: "operation",
		pattern: "open-host-service",
		schema: orderSummary,
	})
	.raises(placed);

// An internal consumable never leaves its context.
const lineAdded = order.provides("Line Added", {
	description: "",
	type: "event",
	internal: true,
});

// A transition rule is about the operation that makes the transition, so the
// invariant names it: only the aggregate's own consumables may be named.
const removeLine = order.provides("Remove Line", {
	description: "Takes a line off the order",
	type: "operation",
	internal: true,
});
nonEmpty.constrains(removeLine);

// Policies react to events with operations, even across contexts.
const billing = ws.addBoundedContext("Billing", { description: "" });
const raise = billing
	.addAggregate("Invoice", { description: "" })
	.provides("Raise Invoice", {
		description: "",
		type: "operation",
		internal: true,
	});
billing
	.addPolicy("Invoice on order placed", { description: "" })
	.on(placed)
	.then(raise);

// Each context keeps its ubiquitous language.
ordering.addTerm("Order", {
	definition: "A customer's request to buy items",
	aliases: ["Purchase"],
	embodiedBy: order,
});

describe("Tactical design", () => {
	it("walks the flow from event to policy to operation", () => {
		const edges = Array.from(
			ODSFlowMap.fromBoundedContext(billing).edges.values(),
		);
		expect(
			edges.map((e) => `${e.source.name} -> ${e.target.name}`),
		).toMatchInlineSnapshot(`
			[
			  "Order Placed -> Invoice on order placed",
			  "Invoice on order placed -> Raise Invoice",
			]
		`);
	});

	it("serialises consumables, schemas and the glossary", () => {
		const schema = ws.toSchema();
		expect(
			schema.boundedcontexts.ordering.aggregates.order.provides.order_placed,
		).toMatchInlineSnapshot(`
			{
			  "comments": undefined,
			  "description": "An order was placed",
			  "disposition": undefined,
			  "internal": undefined,
			  "name": "Order Placed",
			  "pattern": "published-language",
			  "raises": undefined,
			  "returns": undefined,
			  "schema": {
			    "$ref": "#/boundedcontexts/ordering/schemas/order_summary",
			  },
			  "type": "event",
			}
		`);
		expect(
			schema.boundedcontexts.ordering.services.checkout.provides.place_order
				.raises,
		).toMatchInlineSnapshot(`
			[
			  {
			    "$ref": "#/boundedcontexts/ordering/aggregates/order/provides/order_placed",
			  },
			]
		`);
		expect(
			schema.boundedcontexts.ordering.schemas.order_summary.attributes.total,
		).toMatchInlineSnapshot(`
			{
			  "description": undefined,
			  "identity": undefined,
			  "name": "total",
			  "schema": undefined,
			  "type": "Money",
			  "valueobject": {
			    "$ref": "#/boundedcontexts/ordering/valueobjects/money",
			  },
			}
		`);
		expect(
			schema.boundedcontexts.ordering.schemas.order_summary.attributes.lines,
		).toMatchInlineSnapshot(`
			{
			  "description": undefined,
			  "identity": undefined,
			  "name": "lines",
			  "schema": {
			    "$ref": "#/boundedcontexts/ordering/schemas/line_summary",
			  },
			  "type": "LineSummary[]",
			  "valueobject": undefined,
			}
		`);
		expect(
			schema.boundedcontexts.ordering.aggregates.order.invariants.non_empty
				.constrains,
		).toMatchInlineSnapshot(`
			[
			  {
			    "$ref": "#/boundedcontexts/ordering/aggregates/order/entities/order_line",
			  },
			  {
			    "$ref": "#/boundedcontexts/ordering/aggregates/order/provides/remove_line",
			  },
			]
		`);
		expect(lineAdded.internal).toBe(true);
		expect(
			schema.boundedcontexts.ordering.glossary.order.embodiedBy?.$ref,
		).toBe("#/boundedcontexts/ordering/aggregates/order");
	});
});
