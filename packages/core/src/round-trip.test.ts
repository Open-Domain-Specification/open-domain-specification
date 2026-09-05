import { describe, expect, it } from "vitest";
import { makeRichTestWs } from "./makeTestWs";
import { Entity, Workspace } from "./workspace";

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

	/** Invoicing's consumption of Ordering's event, wherever it sits. */
	const orderPlacedConsumption = () => {
		const invoiceApp = rebuilt.getServiceByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/services/invoice_app",
		);
		const consumption = invoiceApp.consumptions.find(
			(it) => it.consumable.name === "Order Placed",
		);
		if (!consumption) throw new Error("Order Placed is not consumed");
		return consumption;
	};

	it("re-links consumptions to live objects", () => {
		const consumption = orderPlacedConsumption();
		expect(consumption.consumable.consumptions).toContain(consumption);
		expect(consumption.consumable.provider.name).toBe("Order");
	});

	it("re-links what makes a consumption", () => {
		expect(orderPlacedConsumption().by.map((it) => it.ref)).toEqual([
			"#/boundedcontexts/invoicing_bc/policies/invoice_on_order_placed",
		]);
	});

	it("leaves by absent when the whole consumer depends on the consumable", () => {
		const invoiceApp = rebuilt.getServiceByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/services/invoice_app",
		);
		expect(invoiceApp.consumptions[0].by).toEqual([]);
		expect(invoiceApp.consumptions[0].toSchema().by).toBeUndefined();
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
		const identified = orderId?.identifies;
		expect(identified?.ref).toBe(
			"#/boundedcontexts/ordering_bc/aggregates/order/entities/order",
		);
		expect(identified instanceof Entity && identified.root).toBe(true);
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

	it("re-links an operation to every shape it refuses with", () => {
		const placeOrder = rebuilt.getConsumableByRefOrThrow(
			"#/boundedcontexts/ordering_bc/services/order_app/provides/place_order",
		);
		expect(placeOrder.rejects.map((it) => it.ref)).toEqual([
			"#/boundedcontexts/ordering_bc/schemas/order_refused",
		]);
		// An operation that refuses with nothing worth naming keeps the field
		// absent rather than carrying an empty array through the schema.
		const raiseInvoice = rebuilt.getConsumableByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/aggregates/invoice/provides/raise_invoice",
		);
		expect(raiseInvoice.rejects).toEqual([]);
		expect(raiseInvoice.toSchema().rejects).toBeUndefined();
	});

	it("keeps attributes on entities and value objects", () => {
		const order = rebuilt.getEntityByRefOrThrow(
			"#/boundedcontexts/ordering_bc/aggregates/order/entities/order",
		);
		expect(order.attributes.get("order_id")?.identity).toBe(true);
		expect(order.attributes.get("total")?.valueobject?.name).toBe("Money");
		// Optional survives the trip; everything unmarked comes back required,
		// and the flag is left out of the JSON rather than written as false.
		expect(order.attributes.get("note")?.optional).toBe(true);
		expect(order.attributes.get("order_id")?.optional).toBe(false);
		expect(
			order.attributes.get("order_id")?.toSchema().optional,
		).toBeUndefined();
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

	it("re-links a context's invariant to what it counts and what guards it", () => {
		const invariant = rebuilt.getInvariantByRefOrThrow(
			"#/boundedcontexts/ordering_bc/invariants/one_open_order_per_customer",
		);
		expect(invariant.kind).toBe("context");
		expect(invariant.boundedcontext.ref).toBe("#/boundedcontexts/ordering_bc");
		expect(invariant.targets.map((it) => it.ref)).toEqual([
			"#/boundedcontexts/ordering_bc/aggregates/order/entities/order",
			"#/boundedcontexts/ordering_bc/services/order_app/provides/place_order",
		]);
		expect(invariant.guarded.map((it) => it.name)).toEqual(["Place Order"]);
	});

	it("re-links a process to the consumables of its whole lifecycle", () => {
		const process = rebuilt.getProcessByRefOrThrow(
			"#/boundedcontexts/invoicing_bc/processes/invoice_to_customer",
		);
		expect(process.startEvents.map((it) => it.name)).toEqual([
			"Invoice Raised",
		]);
		expect(process.commands.map((it) => it.name)).toEqual(["Send Invoice"]);
		expect(process.endEvents.map((it) => it.name)).toEqual(["Invoice Sent"]);
		expect(process.events).toEqual([]);
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
