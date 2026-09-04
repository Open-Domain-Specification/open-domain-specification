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
			  "error internal-consumable: Policy "Reprice on order" reacts to "Reprice", which is internal to "Catalog"",
			  "error internal-consumable: Policy "Reprice on order" issues "Reprice", which is internal to "Catalog"",
			  "error consumable-kind: Policy "Reprice on order" reacts to "Reprice", which is an operation, not an event",
			  "warning context-serves-subdomain: Bounded context "Ordering" serves no subdomain, so it is missing from the problem-space view",
			  "warning context-serves-subdomain: Bounded context "Catalog" serves no subdomain, so it is missing from the problem-space view",
			]
		`);
	});
});
