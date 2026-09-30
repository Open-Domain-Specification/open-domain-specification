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

	it("counts a value object that only relates to the value, and not one that only specialises it", () => {
		const { sales, money } = makeWs();
		const wallet = sales.addValueObject("Wallet", { description: "" });
		wallet.addRelation(money, { relation: "uses" });
		sales.addValueObject("Euro", { description: "", specialises: money });

		expect(usersOfValueObject(money).map((it) => it.owner.name)).toEqual([
			"Wallet",
		]);
	});

	it("is empty for a value nobody uses", () => {
		expect(usersOfValueObject(makeWs().money)).toEqual([]);
	});
});
