import { describe, expect, it } from "vitest";
import { usersOfValueObject } from "./value-object-users";
import { Workspace } from "./workspace";

function makeWs() {
	const ws = new Workspace("WS", { description: "", version: "test" });
	const subdomain = ws
		.addDomain("Shop", { description: "" })
		.addSubdomain("Selling", { type: "core", description: "" });
	const kernel = subdomain.addBoundedcontext("Kernel", { description: "" });
	const sales = subdomain.addBoundedcontext("Sales", { description: "" });
	const money = kernel.addValueObject("Money", { description: "" });
	return { kernel, sales, money };
}

describe("usersOfValueObject", () => {
	it("names aggregates, nested value objects and schemas in every context, once each and in workspace order", () => {
		const { kernel, sales, money } = makeWs();
		const order = sales.addAggregate("Order", { description: "" });
		const line = order.addEntity("Line", { description: "", root: true });
		line.addAttribute("price", { type: "Money", valueobject: money });
		line.addAttribute("tax", { type: "Money", valueobject: money });
		const basket = sales.addValueObject("Basket", { description: "" });
		basket.addAttribute("total", { type: "Money", valueobject: money });
		const quote = kernel.addSchema("Quote");
		quote.addAttribute("amount", { type: "Money", valueobject: money });

		expect(
			usersOfValueObject(money).map((it) => [
				it.kind,
				it.boundedcontext.name,
				it.owner.name,
			]),
		).toEqual([
			["schema", "Kernel", "Quote"],
			["aggregate", "Sales", "Order"],
			["value object", "Sales", "Basket"],
		]);
	});

	it("counts a relation and a kind that specialises the value", () => {
		const { sales, money } = makeWs();
		const wallet = sales.addValueObject("Wallet", { description: "" });
		wallet.addRelation(money, { relation: "uses" });
		sales.addValueObject("Euro", { description: "", specialises: money });

		expect(usersOfValueObject(money).map((it) => it.owner.name)).toEqual([
			"Wallet",
			"Euro",
		]);
		expect(usersOfValueObject(money)[1]).toMatchObject({ asKind: true });
	});

	it("shows a borrowed kind and its holder as users of the parent", () => {
		const { sales, money } = makeWs();
		const fee = sales.addValueObject("Fee", {
			description: "",
			specialises: money,
		});
		const card = sales.addAggregate("Card", { description: "" });
		card
			.addEntity("Card", { description: "", root: true })
			.addAttribute("fee", { type: "Fee", valueobject: fee });

		expect(usersOfValueObject(money)).toMatchObject([
			{
				kind: "aggregate",
				owner: { name: "Card" },
				through: [{ name: "Fee" }],
			},
			{ kind: "value object", owner: { name: "Fee" }, asKind: true },
		]);
		expect(usersOfValueObject(fee)).toMatchObject([
			{ kind: "aggregate", owner: { name: "Card" }, through: [] },
		]);
	});

	it("shows a parent-typed holder as a user of each kind, marked through that parent", () => {
		const { kernel, money } = makeWs();
		const ledgerAccount = kernel.addValueObject("LedgerAccount", {
			description: "",
		});
		const customer = kernel.addValueObject("CustomerLedgerAccount", {
			description: "",
			specialises: ledgerAccount,
		});
		ledgerAccount.addAttribute("amount", { type: "Money", valueobject: money });
		const journal = kernel.addAggregate("JournalEntry", { description: "" });
		journal
			.addEntity("Posting", { description: "", root: true })
			.addAttribute("account", {
				type: "LedgerAccount",
				valueobject: ledgerAccount,
			});

		expect(usersOfValueObject(customer)).toMatchObject([
			{
				kind: "aggregate",
				owner: { name: "JournalEntry" },
				through: [{ name: "LedgerAccount" }],
			},
		]);
		expect(usersOfValueObject(ledgerAccount)).toMatchObject([
			{ kind: "aggregate", owner: { name: "JournalEntry" }, through: [] },
			{
				kind: "value object",
				owner: { name: "CustomerLedgerAccount" },
				asKind: true,
			},
		]);
		expect(usersOfValueObject(money).map((it) => it.owner.name)).toEqual([
			"LedgerAccount",
			"CustomerLedgerAccount",
		]);
	});

	it("is empty for a value nobody uses", () => {
		expect(usersOfValueObject(makeWs().money)).toEqual([]);
	});
});
