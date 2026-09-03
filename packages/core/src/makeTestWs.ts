import { type Attribute, Workspace } from "./workspace";

export function makeTestWs() {
	const ws = new Workspace("WS", {
		odsVersion: "1.0.0",
		description: "Demo",
		version: "test",
	});

	const d1 = ws.addDomain("D1", {
		description: "",
	});

	const d1Sd1 = d1.addSubdomain([d1.name, "SD1"].join("."), {
		type: "core",
		description: "",
	});

	const d1Sd1Bc1 = d1Sd1.addBoundedcontext([d1Sd1.name, "BC1"].join("."), {
		description: "",
	});

	const d1Sd1Bc1S1 = d1Sd1Bc1.addService([d1Sd1Bc1.name, "S1"].join("."), {
		type: "domain",
		description: "",
	});

	const d1Sd1Bc1S1C1 = d1Sd1Bc1S1.addConsumable(
		[d1Sd1Bc1S1.name, "C1"].join("."),
		{
			description: "",
			pattern: "open-host-service",
			type: "operation",
		},
	);

	const d1Sd1Bc1Ag1 = d1Sd1Bc1.addAggregate([d1Sd1Bc1.name, "Ag1"].join("."), {
		description: "",
	});

	const d1Sd1Bc1Ag1I1 = d1Sd1Bc1Ag1.addInvariant(
		[d1Sd1Bc1Ag1.name, "I1"].join("."),
		{
			description: "",
		},
	);

	const d1Sd1Bc1S1Ag1E1 = d1Sd1Bc1Ag1.addEntity(
		[d1Sd1Bc1Ag1.name, "E1"].join("."),
		{
			description: "",
		},
	);

	const d1Sd1Bc1Ag1Vo1 = d1Sd1Bc1Ag1.addValueObject(
		[d1Sd1Bc1Ag1.name, "Vo1"].join("."),
		{
			description: "",
		},
	);

	const d2 = ws.addDomain("D2", {
		description: "",
	});

	const d2Sd1 = d2.addSubdomain([d2.name, "SD1"].join("."), {
		type: "core",
		description: "",
	});

	const d2Sd1Bc1 = d2Sd1.addBoundedcontext([d2Sd1.name, "BC1"].join("."), {
		description: "",
	});

	const d2Sd1Bc1S1 = d2Sd1Bc1.addService([d2Sd1Bc1.name, "S1"].join("."), {
		type: "domain",
		description: "",
	});

	const d2Sd1Bc1S1Co1 = d2Sd1Bc1S1.addConsumption(d1Sd1Bc1S1C1, {
		pattern: "conformist",
	});

	const d2Sd1Bc1S1Ag1 = d2Sd1Bc1.addAggregate(
		[d2Sd1Bc1.name, "Ag1"].join("."),
		{
			description: "",
		},
	);

	const d2Sd1Bc1S1Ag1E1 = d2Sd1Bc1S1Ag1.addEntity(
		[d2Sd1Bc1S1Ag1.name, "E1"].join("."),
		{
			description: "",
		},
	);

	const d2Sd1Bc1S1Ag1Vo1 = d2Sd1Bc1S1Ag1.addValueObject(
		[d2Sd1Bc1S1Ag1.name, "Vo1"].join("."),
		{
			description: "",
		},
	);

	return {
		ws,
		d1,
		d1Sd1,
		d1Sd1Bc1,
		d1Sd1Bc1S1,
		d1Sd1Bc1S1C1,
		d1Sd1Bc1Ag1,
		d1Sd1Bc1Ag1I1,
		d1Sd1Bc1S1Ag1E1,
		d1Sd1Bc1Ag1Vo1,
		d2,
		d2Sd1,
		d2Sd1Bc1,
		d2Sd1Bc1S1,
		d2Sd1Bc1S1Co1,
		d2Sd1Bc1S1Ag1,
		d2Sd1Bc1S1Ag1E1,
		d2Sd1Bc1S1Ag1Vo1,
	};
}

/**
 * A fixture with distinct descriptions, a root entity, entity relations,
 * schemas, a published event, internal event and operation pairs joined by
 * raises and a policy, and an aggregate consumption, so that round-trips and
 * derived maps exercise every reference kind.
 */
export function makeRichTestWs() {
	const ws = new Workspace("Rich WS", {
		odsVersion: "1.0.0",
		description: "Rich fixture",
		version: "1.2.3",
		homepage: "https://example.com",
		primaryColor: "#123456",
	});

	const salesTeam = ws.addTeam("Sales Team", {
		description: "Owns ordering",
		homepage: "https://example.com/sales",
	});

	const sales = ws.addDomain("Sales", {
		description: "Sales domain",
	});
	const ordering = sales.addSubdomain("Ordering", {
		type: "core",
		description: "Ordering subdomain",
	});
	const orderingBc = ordering.addBoundedcontext("Ordering BC", {
		description: "Ordering bounded context",
	});
	orderingBc.ownedBy(salesTeam);
	const orderAgg = orderingBc.addAggregate("Order", {
		description: "Order aggregate",
	});
	const order = orderAgg.addRootEntity("Order", {
		description: "Order root",
	});
	const orderLine = orderAgg.addEntity("Order Line", {
		description: "A line on the order",
	});
	const money = orderAgg.addValueObject("Money", {
		description: "Amount and currency",
	});
	money.addAttribute("Amount", { type: "decimal" });
	money.addAttribute("Currency", { type: "ISO 4217" });
	order.addAttribute("Order Id", { type: "OrderId", identity: true });
	order.addAttribute("Total", { type: "Money", valueobject: money });
	order.includes(orderLine, "has lines", "1..*");
	orderLine.uses(money, "priced in", "1");
	const nonEmpty = orderAgg
		.addInvariant("Non-empty", {
			description: "An order has at least one line",
		})
		.constrains(orderLine, order.attributes.get("total") as Attribute);
	const orderSummary = orderingBc.addSchema("Order Summary", {
		description: "What the outside learns about an order",
	});
	orderSummary.addAttribute("Order Id", { type: "OrderId", identity: true });
	orderSummary.addAttribute("Total", {
		type: "Money",
		description: "Order total",
		valueobject: money,
	});
	const orderPlaced = orderAgg.provides("Order Placed", {
		description: "Raised when an order is placed",
		type: "event",
		pattern: "published-language",
		schema: orderSummary,
	});
	const orderTerm = orderingBc.addTerm("Order", {
		definition: "A customer's request to buy one or more items",
		aliases: ["Purchase order"],
		embodiedBy: orderAgg,
	});
	const orderRequest = orderingBc.addSchema("Order Request");
	orderRequest.addAttribute("Lines", { type: "OrderLine[]" });
	const orderApp = orderingBc.addService("Order App", {
		description: "Order application service",
		type: "application",
	});
	const placeOrder = orderApp
		.provides("Place Order", {
			description: "Places an order",
			type: "operation",
			pattern: "open-host-service",
			schema: orderRequest,
		})
		.raises(orderPlaced);

	const billing = ws.addDomain("Billing", {
		description: "Billing domain",
	});
	const invoicing = billing.addSubdomain("Invoicing", {
		type: "supporting",
		description: "Invoicing subdomain",
	});
	const invoicingBc = invoicing.addBoundedcontext("Invoicing BC", {
		description: "Invoicing bounded context",
	});
	const invoiceAgg = invoicingBc.addAggregate("Invoice", {
		description: "Invoice aggregate",
	});
	const invoice = invoiceAgg.addRootEntity("Invoice", {
		description: "Invoice root",
	});
	invoice.references(order, "bills");
	const invoiceConsumesOrderPlaced = invoiceAgg.consumes(orderPlaced, {
		pattern: "conformist",
	});
	const invoiceRaised = invoiceAgg.provides("Invoice Raised", {
		description: "An invoice was raised",
		type: "event",
		internal: true,
	});
	const raiseInvoice = invoiceAgg
		.provides("Raise Invoice", {
			description: "Raises an invoice for an order",
			type: "operation",
			internal: true,
		})
		.raises(invoiceRaised);
	const invoiceOnOrderPlaced = invoicingBc
		.addPolicy("Invoice on order placed", {
			description: "When an order is placed, raise an invoice",
		})
		.on(orderPlaced)
		.then(raiseInvoice);
	const invoiceApp = invoicingBc.addService("Invoice App", {
		description: "Invoice application service",
		type: "application",
	});
	const invoiceAppConsumesPlaceOrder = invoiceApp.consumes(placeOrder, {
		pattern: "anti-corruption-layer",
	});

	const reportingBc = ws.addBoundedContext("Reporting BC", {
		description: "Reporting bounded context, serves no subdomain",
		bigBallOfMud: true,
	});
	const salesReportsPartnership = reportingBc.partnerOf(orderingBc, {
		description: "Reporting and ordering plan releases together",
	});

	return {
		ws,
		salesTeam,
		sales,
		ordering,
		orderingBc,
		orderAgg,
		order,
		orderLine,
		money,
		nonEmpty,
		orderSummary,
		orderRequest,
		orderPlaced,
		orderTerm,
		orderApp,
		placeOrder,
		billing,
		invoicing,
		invoicingBc,
		invoiceAgg,
		invoice,
		invoiceConsumesOrderPlaced,
		invoiceRaised,
		raiseInvoice,
		invoiceOnOrderPlaced,
		invoiceApp,
		invoiceAppConsumesPlaceOrder,
		reportingBc,
		salesReportsPartnership,
	};
}
