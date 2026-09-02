import { ODSContextMap, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";

const ws = new Workspace("eCommerce", {
	odsVersion: "1.0.0",
	description: "Strategic design example",
	version: "0.1.0",
});

// Subdomains carry the core / supporting / generic classification.
const commerce = ws.addDomain("Commerce", { description: "Selling things" });
const sales = commerce.addSubdomain("Sales", {
	type: "core",
	description: "From cart to order",
});
const fulfilment = commerce.addSubdomain("Fulfilment", {
	type: "supporting",
	description: "Getting orders to customers",
});
const identity = ws
	.addDomain("Platform", { description: "Shared capabilities" })
	.addSubdomain("Identity", { type: "generic", description: "Who is who" });

// Teams own bounded contexts.
const salesTeam = ws.addTeam("Sales Team", {
	description: "Owns ordering end to end",
});

// A bounded context belongs to the workspace and may serve several subdomains.
const ordering = ws.addBoundedContext("Ordering", {
	description: "Checkout and orders",
	subdomains: [sales, fulfilment],
	team: salesTeam,
});
const shipping = fulfilment.addBoundedcontext("Shipping", {
	description: "Carriers and labels",
});
const accounts = identity.addBoundedcontext("Accounts", {
	description: "Legacy user store",
	bigBallOfMud: true,
});

// Relationships are declared explicitly ...
shipping.downstreamOf(ordering, {
	type: "customer-supplier",
	upstreamRoles: ["published-language"],
	downstreamRoles: ["conformist"],
});
accounts.separateWaysFrom(shipping);

// ... or implied from consumptions between contexts with no declaration.
const orderAgg = ordering.addAggregate("Order", { description: "" });
const published = orderAgg.provides("Order Placed", {
	description: "",
	type: "event",
	pattern: "published-language",
});
accounts
	.addService("Notifier", { description: "", type: "application" })
	.consumes(published, { pattern: "anti-corruption-layer" });

describe("Strategic design", () => {
	it("draws declared and implied relationships", () => {
		const edges = Array.from(ODSContextMap.fromWorkspace(ws).edges.values());
		expect(
			edges.map(
				(e) =>
					`${e.source.name} -[${e.type}${e.implied ? ", implied" : ""}]-> ${e.target.name}`,
			),
		).toMatchInlineSnapshot(`
				[
				  "Ordering -[customer-supplier]-> Shipping",
				  "Accounts -[separate-ways]-> Shipping",
				  "Ordering -[upstream-downstream, implied]-> Accounts",
				]
			`);
	});

	it("derives what a subdomain is served by and what a team owns", () => {
		expect(Array.from(fulfilment.boundedcontexts.keys())).toEqual([
			"ordering",
			"shipping",
		]);
		expect(salesTeam.boundedcontexts.map((bc) => bc.name)).toEqual([
			"Ordering",
		]);
	});
});
