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

	it("re-links consumables to their schema and schema attributes to value objects", () => {
		const consumable = rebuilt.getConsumableByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/order/provides/order_placed",
		);
		expect(consumable.schema?.ref).toBe(
			"#/boundedcontexts/ordering_bc/schemas/order_summary",
		);
		expect(consumable.schema?.attributes.get("total")?.valueobject?.name).toBe(
			"Money",
		);
		expect(consumable.internal).toBe(false);
	});

	it("re-links an identity attribute to the root it identifies", () => {
		const invoice = rebuilt.getEntityByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/aggregates/invoice/entities/invoice",
		);
		const orderId = invoice.attributes.get("order_id");
		expect(orderId?.identifies?.ref).toBe(
			"#/boundedcontexts/ordering_bc/aggregates/order/entities/order",
		);
		expect(orderId?.identifies?.root).toBe(true);
	});

	it("re-links operations to the events they raise and keeps internal flags", () => {
		const placeOrder = rebuilt.getConsumableByRefOrThrow(
			"#/boundedcontexts/ordering_bc/services/order_app/provides/place_order",
		);
		expect(placeOrder.raisedEvents.map((it) => it.name)).toEqual([
			"Order Placed",
		]);
		expect(placeOrder.schema?.attributes.get("lines")?.type).toBe(
			"OrderLine[]",
		);
		const raiseInvoice = rebuilt.getConsumableByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/aggregates/invoice/provides/raise_invoice",
		);
		expect(raiseInvoice.internal).toBe(true);
		expect(raiseInvoice.raisedEvents.map((it) => it.name)).toEqual([
			"Invoice Raised",
		]);
	});

	it("re-links an operation to the schema it returns, apart from the one it takes", () => {
		const placeOrder = rebuilt.getConsumableByRefOrThrow(
			"#/boundedcontexts/ordering_bc/services/order_app/provides/place_order",
		);
		expect(placeOrder.schema?.ref).toBe(
			"#/boundedcontexts/ordering_bc/schemas/order_request",
		);
		expect(placeOrder.returns?.ref).toBe(
			"#/boundedcontexts/ordering_bc/schemas/order_summary",
		);
		// An operation that answers with nothing keeps returns absent.
		const raiseInvoice = rebuilt.getConsumableByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/aggregates/invoice/provides/raise_invoice",
		);
		expect(raiseInvoice.returns).toBeUndefined();
		expect(raiseInvoice.toSchema().returns).toBeUndefined();
	});

	it("keeps attributes on entities and value objects", () => {
		const order = rebuilt.getEntityByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/order/entities/order",
		);
		expect(order.attributes.get("order_id")?.identity).toBe(true);
		expect(order.attributes.get("total")?.valueobject?.name).toBe("Money");
		const money = rebuilt.getValueObjectByRefOrThrow(
			"#/boundedcontexts/ordering_bc/valueobjects/money",
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

	it("re-links policies to consumables across contexts", () => {
		const policy = rebuilt.getPolicyByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/policies/invoice_on_order_placed",
		);
		expect(policy.events.map((it) => it.ref)).toEqual([
			"#/boundedcontexts/ordering_bc/aggregates/order/provides/order_placed",
		]);
		expect(policy.commands.map((it) => it.name)).toEqual(["Raise Invoice"]);
	});

	it("re-links glossary terms to what embodies them", () => {
		const term = rebuilt.getTermByRefOrThrow(
			"#/boundedcontexts/ordering_bc/glossary/order",
		);
		expect(term.aliases).toEqual(["Purchase order"]);
		expect(term.embodiedBy?.ref).toBe(
			"#/boundedcontexts/ordering_bc/aggregates/order",
		);
	});

	it("re-links entity relations across aggregates", () => {
		const basket = rebuilt.getEntityByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/basket/entities/basket",
		);
		expect(basket.root).toBe(true);
		expect(basket.relations).toHaveLength(1);
		expect(basket.relations[0].target.name).toBe("Order");
		expect(basket.relations[0].relation).toBe("references");
		expect(basket.relations[0].label).toBe("became");
		const order = rebuilt.getEntityByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/order/entities/order",
		);
		expect(order.relations[0].cardinality).toBe("1..*");
	});
});
