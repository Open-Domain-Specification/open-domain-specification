import { describe, expect, it } from "vitest";
import { makeRichTestWs } from "./makeTestWs";
import { Workspace } from "./workspace";

describe("schema round-trip", () => {
	const { ws } = makeRichTestWs();
	const schema = ws.toSchema();
	const rebuilt = Workspace.fromSchema(schema);

	it("produces an identical schema after fromSchema/toSchema", () => {
		expect(rebuilt.toSchema()).toEqual(schema);
	});

	it("survives JSON serialisation", () => {
		const viaJson = Workspace.fromSchema(JSON.parse(JSON.stringify(schema)));
		expect(viaJson.toSchema()).toEqual(schema);
	});

	it("preserves descriptions at every level", () => {
		const subdomain = rebuilt.getSubdomainByRefOrThrow(
			"#/domains/sales/subdomains/ordering",
		);
		expect(subdomain.description).toBe("Ordering subdomain");
		const bc = rebuilt.getBoundedContextByRefOrThrow(
			"#/boundedcontexts/ordering_bc",
		);
		expect(bc.description).toBe("Ordering bounded context");
	});

	it("re-links consumptions to live objects", () => {
		const invoiceAgg = rebuilt.getAggregateByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/aggregates/invoice",
		);
		expect(invoiceAgg.consumptions).toHaveLength(1);
		const consumption = invoiceAgg.consumptions[0];
		expect(consumption.consumable.name).toBe("Order Placed");
		expect(consumption.consumable.consumptions).toContain(consumption);
		expect(consumption.consumable.provider.name).toBe("Order");
	});

	it("re-links published consumables to their event and attributes to value objects", () => {
		const consumable = rebuilt.getConsumableByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/order/provides/order_placed",
		);
		expect(consumable.event?.ref).toBe(
			"#/boundedcontexts/ordering_bc/aggregates/order/events/order_placed",
		);
		expect(consumable.event?.attributes.get("total")?.valueobject?.name).toBe(
			"Money",
		);
	});

	it("re-links commands to the events they raise and to exposing consumables", () => {
		const command = rebuilt.getCommandByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/order/commands/place_order",
		);
		expect(command.raisedEvents.map((it) => it.name)).toEqual(["Order Placed"]);
		expect(command.attributes.get("lines")?.type).toBe("OrderLine[]");
		const consumable = rebuilt.getConsumableByRefOrThrow(
			"#/boundedcontexts/ordering_bc/services/order_app/provides/place_order",
		);
		expect(consumable.command).toBe(command);
	});

	it("keeps attributes on entities and value objects", () => {
		const order = rebuilt.getEntityByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/order/entities/order",
		);
		expect(order.attributes.get("order_id")?.identity).toBe(true);
		expect(order.attributes.get("total")?.valueobject?.name).toBe("Money");
		const money = rebuilt.getValueObjectByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/order/valueobjects/money",
		);
		expect(Array.from(money.attributes.keys())).toEqual(["amount", "currency"]);
	});

	it("re-links invariants to the elements they constrain", () => {
		const invariant = rebuilt.getInvariantByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/order/invariants/non_empty",
		);
		expect(invariant.targets.map((it) => it.ref)).toEqual([
			"#/boundedcontexts/ordering_bc/aggregates/order/entities/order_line",
			"#/boundedcontexts/ordering_bc/aggregates/order/entities/order/attributes/total",
		]);
	});

	it("re-links entity relations across aggregates", () => {
		const invoice = rebuilt.getEntityByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/aggregates/invoice/entities/invoice",
		);
		expect(invoice.root).toBe(true);
		expect(invoice.relations).toHaveLength(1);
		expect(invoice.relations[0].target.name).toBe("Order");
		expect(invoice.relations[0].relation).toBe("references");
		expect(invoice.relations[0].label).toBe("bills");
	});
});
