import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";

const ws = new Workspace("Shop", {
	odsVersion: "1.0.0",
	description: "Validation example",
	version: "0.1.0",
});
const ordering = ws.addBoundedContext("Ordering", { description: "" });
const order = ordering.addAggregate("Order", { description: "" });
const orderRoot = order.addRootEntity("Order", { description: "" });

const catalog = ws.addBoundedContext("Catalog", { description: "" });
const product = catalog.addAggregate("Product", { description: "" });
product.addRootEntity("Product", { description: "" });
const price = product.addEntity("Price", { description: "" });

// Reaching into another aggregate's non-root entity breaks the aggregate rule,
// and Price is in another bounded context too, which no relation may cross: an
// order holds the product's identity and consumes what Catalog publishes.
orderRoot.references(price, "priced at");

// The identity an attribute holds may name a child: an order can hold the id
// of the Price inside the Product boundary, which it reaches through Product.
// That is a dependency the model records, not an error.
orderRoot.addAttribute("priceId", { type: "string", identifies: price });

// An internal consumable is not offered to other contexts, and a policy
// reacts to events, not operations.
const reprice = product.provides("Reprice", {
	description: "",
	type: "operation",
	internal: true,
});
ordering
	.addPolicy("Reprice on order", { description: "" })
	.on(reprice)
	.then(reprice);

describe("Validation", () => {
	it("reports structural DDD rule violations", () => {
		expect(
			ws.validate().map((d) => `${d.severity} ${d.rule}: ${d.message}`),
		).toMatchInlineSnapshot(`
			[
			  "error cross-aggregate-reference: "Order" references "Price", which is not the root of aggregate "Product"; reference other aggregates by their root's identity",
			  "error cross-context-relation: "Order" in "Ordering" references "Price" in "Catalog"; a relation never crosses a bounded context, so hold "Price"'s identity as an attribute on "Order" instead",
			  "error root-identity: Root entity "Order" of aggregate "Order" declares no identity attribute, so nothing says which "Order" a reference means",
			  "error root-identity: Root entity "Product" of aggregate "Product" declares no identity attribute, so nothing says which "Product" a reference means",
			  "warning entity-identity: Entity "Price" in aggregate "Product" declares no identity attribute; an entity is what you tell apart from another holding the same values, so without one "Price" is a value object",
			  "warning aggregate-tree: "Price" is in aggregate "Product" but no chain of "includes" or "references" reaches it from "Product", so nothing inside the boundary can get to it",
			  "error internal-consumable: Policy "Reprice on order" reacts to "Reprice", which is internal to "Catalog"",
			  "error internal-consumable: Policy "Reprice on order" issues "Reprice", which is internal to "Catalog"",
			  "error policy-in-context: Policy "Reprice on order" in "Ordering" issues "Reprice", which belongs to "Catalog"",
			  "error consumable-kind: Policy "Reprice on order" reacts to "Reprice", which is an operation, not an event",
			  "warning reaction-cycle: Reactions run in a cycle: "Reprice" -> "Reprice on order" -> "Reprice"; the chain triggers itself and nothing in the model says what ends it; it runs through "Catalog" and "Ordering", so no one context can see the whole ring",
			  "warning context-serves-subdomain: Bounded context "Ordering" serves no subdomain, so it is missing from the problem-space view",
			  "warning context-serves-subdomain: Bounded context "Catalog" serves no subdomain, so it is missing from the problem-space view",
			]
		`);
	});
});
