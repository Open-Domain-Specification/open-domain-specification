import { describe, expect, it } from "vitest";
import { usersOfSchema } from "./schema-users";
import { Workspace } from "./workspace";

function makeWs() {
	const ws = new Workspace("WS", { description: "", version: "test" });
	const subdomain = ws
		.addDomain("Shop", { description: "" })
		.addSubdomain("Selling", { type: "core", description: "" });
	const ledger = subdomain.addBoundedcontext("Ledger", { description: "" });
	const sales = subdomain.addBoundedcontext("Sales", { description: "" });
	const line = ledger.addSchema("PostingLine");
	return { ledger, sales, line };
}

const describeUsers = (users: ReturnType<typeof usersOfSchema>) =>
	users.map((it) => [it.kind, it.boundedcontext.name, it.owner.name]);

describe("usersOfSchema", () => {
	it("finds a schema that only another schema nests, and the carriers of that one are not its users", () => {
		const { ledger, line } = makeWs();
		const entry = ledger.addSchema("PostEntry");
		entry.addAttribute("postings", { type: "PostingLine[]", schema: line });
		const journal = ledger.addAggregate("Journal", { description: "" });
		journal.provides("PostEntry", {
			type: "operation",
			description: "",
			schema: entry,
		});

		expect(describeUsers(usersOfSchema(line))).toEqual([
			["schema", "Ledger", "PostEntry"],
		]);
		expect(describeUsers(usersOfSchema(entry))).toEqual([
			["consumable", "Ledger", "PostEntry"],
		]);
	});

	it("names carriers, aggregates, value objects and schemas in every context, once each and in workspace order", () => {
		const { ledger, sales, line } = makeWs();
		const journal = ledger.addAggregate("Journal", { description: "" });
		journal.provides("Post", {
			type: "operation",
			description: "",
			schema: line,
			returns: line,
		});
		const order = sales.addAggregate("Order", { description: "" });
		const root = order.addEntity("Line", { description: "", root: true });
		root.addAttribute("first", { type: "PostingLine", schema: line });
		root.addAttribute("second", { type: "PostingLine", schema: line });
		const basket = sales.addValueObject("Basket", { description: "" });
		basket.addAttribute("lines", { type: "PostingLine[]", schema: line });
		const quote = sales.addSchema("Quote");
		quote.addAttribute("line", { type: "PostingLine", schema: line });

		expect(describeUsers(usersOfSchema(line))).toEqual([
			["consumable", "Ledger", "Post"],
			["aggregate", "Sales", "Order"],
			["value object", "Sales", "Basket"],
			["schema", "Sales", "Quote"],
		]);
	});

	it("does not count a lookalike type string or a schema that only mentions itself", () => {
		const { ledger, line } = makeWs();
		line.addAttribute("next", { type: "PostingLine", schema: line });
		const other = ledger.addSchema("Other");
		other.addAttribute("text", { type: "PostingLine" });

		expect(usersOfSchema(line)).toEqual([]);
	});
});
