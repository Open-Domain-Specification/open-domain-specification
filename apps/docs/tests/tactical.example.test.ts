import { ODSFlowMap, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";

const ws = new Workspace("eCommerce", {
	odsVersion: "1.0.0",
	description: "Tactical design example",
	version: "0.1.0",
});
const ordering = ws.addBoundedContext("Ordering", { description: "" });
const order = ordering.addAggregate("Order", { description: "A purchase" });

// Entities and value objects carry typed attributes; identity attributes
// identify an entity and an attribute may point at the value object that
// models its type.
const money = order.addValueObject("Money", {
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
order
	.addInvariant("Non-empty", { description: "An order has at least one line" })
	.constrains(line);

// Commands raise domain events; both carry attributes.
const placed = order.addEvent("OrderPlaced", {
	description: "An order was placed",
});
placed.addAttribute("orderId", { type: "OrderId", identity: true });
const place = order
	.addCommand("PlaceOrder", { description: "Place a new order" })
	.raises(placed);

// An operation consumable exposes a command; an event consumable publishes an event.
ordering
	.addService("Checkout", { description: "", type: "application" })
	.provides("PlaceOrder", {
		description: "POST /orders",
		type: "operation",
		pattern: "open-host-service",
		command: place,
	});
order.publishes(placed, { pattern: "published-language" });

// Policies react to events with commands, even across contexts.
const billing = ws.addBoundedContext("Billing", { description: "" });
const invoice = billing.addAggregate("Invoice", { description: "" });
const raise = invoice.addCommand("RaiseInvoice", { description: "" });
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
	it("walks the flow from event to policy to command", () => {
		const edges = Array.from(
			ODSFlowMap.fromBoundedContext(billing).edges.values(),
		);
		expect(
			edges.map((e) => `${e.source.name} -> ${e.target.name}`),
		).toMatchInlineSnapshot(`
				[
				  "OrderPlaced -> Invoice on order placed",
				  "Invoice on order placed -> RaiseInvoice",
				]
			`);
	});

	it("serialises attributes, refs and the glossary", () => {
		const schema = ws.toSchema();
		expect(
			schema.boundedcontexts.ordering.aggregates.order.entities.order.attributes
				.total,
		).toMatchInlineSnapshot(`
				{
				  "description": undefined,
				  "identity": undefined,
				  "name": "total",
				  "type": "Money",
				  "valueobject": {
				    "$ref": "#/boundedcontexts/ordering/aggregates/order/valueobjects/money",
				  },
				}
			`);
		expect(
			schema.boundedcontexts.ordering.glossary.order.embodiedBy?.$ref,
		).toBe("#/boundedcontexts/ordering/aggregates/order");
	});
});
