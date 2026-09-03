// The same bookshop as minimal.ods.json, authored with the DSL.
// Run with `node minimal.workspace.ts` (Node 24) or `npx tsx minimal.workspace.ts`.
import fs from "node:fs";
import { Workspace } from "@open-domain-specification/core";

export const workspace = new Workspace("Bookshop", {
	odsVersion: "1.0.0",
	version: "0.1.0",
	description:
		"A small online bookshop: a catalogue of titles and the orders customers place for them.",
});

const bookselling = workspace.addDomain("Bookselling", {
	description: "Everything involved in selling books online",
});
const sales = bookselling.addSubdomain("Sales", {
	type: "core",
	description: "Taking and fulfilling orders",
});
const shopTeam = workspace.addTeam("Shop Team", {
	description: "Runs the online shop",
});

const orders = sales.addBoundedcontext("Orders", {
	description: "Owns orders from placement to dispatch",
	team: shopTeam,
});

const orderAgg = orders.addAggregate("Order", {
	description: "One customer's request to buy some books",
});
const order = orderAgg.addRootEntity("Order", {
	description: "The order itself",
});
order.addAttribute("orderNumber", { type: "order number", identity: true });
const total = order.addAttribute("total", { type: "money" });

const address = orderAgg.addValueObject("Address", {
	description: "Where the order ships to",
});
address.addAttribute("lines", { type: "text" });
address.addAttribute("postcode", { type: "postcode" });
order.uses(address, "ships-to", "1");

orderAgg
	.addInvariant("Total not negative", {
		description: "An order's total can never be below zero",
	})
	.constrains(total);

const orderPlacedSchema = orders.addSchema("OrderPlaced", {
	description: "What other parts learn when an order is placed",
});
orderPlacedSchema.addAttribute("orderNumber", {
	type: "order number",
	identity: true,
});
orderPlacedSchema.addAttribute("total", { type: "money" });

const orderPlaced = orderAgg.provides("OrderPlaced", {
	type: "event",
	description: "A customer placed an order",
	pattern: "published-language",
	schema: orderPlacedSchema,
});

const orderApi = orders.addService("Order API", {
	type: "application",
	description: "The endpoints the web shop calls",
});
orderApi
	.provides("PlaceOrder", {
		type: "operation",
		description: "POST /orders",
		pattern: "open-host-service",
	})
	.raises(orderPlaced);

orders.addTerm("Order", {
	definition: "A customer's request to buy some books, paid up front",
	aliases: ["Purchase"],
	embodiedBy: orderAgg,
});

// Generator: validate, then write the workspace beside its schema.
if (process.argv[1]?.endsWith("minimal.workspace.ts")) {
	for (const d of workspace.validate()) {
		console.log(`[${d.severity}] ${d.rule}: ${d.message} (${d.ref})`);
	}
	fs.mkdirSync(".ods", { recursive: true });
	fs.writeFileSync(
		".ods/bookshop.json",
		JSON.stringify(
			{ $schema: "./schema.json", ...workspace.toSchema() },
			null,
			2,
		),
	);
}
