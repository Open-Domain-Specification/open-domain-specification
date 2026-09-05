import { describe, expect, it } from "vitest";
import { makeRichTestWs } from "./makeTestWs";
import { teamRef } from "./schema";
import { Workspace } from "./workspace";

describe("Workspace ref lookups", () => {
	const fixture = makeRichTestWs();
	const { ws } = fixture;

	it("resolves every ref kind to the object that produced it", () => {
		expect(ws.getDomainByRef(fixture.sales.ref)).toBe(fixture.sales);
		expect(ws.getSubdomainByRef(fixture.ordering.ref)).toBe(fixture.ordering);
		expect(ws.getBoundedContextByRef(fixture.orderingBc.ref)).toBe(
			fixture.orderingBc,
		);
		expect(ws.getAggregateByRef(fixture.orderAgg.ref)).toBe(fixture.orderAgg);
		expect(ws.getServiceByRef(fixture.orderApp.ref)).toBe(fixture.orderApp);
		expect(ws.getEntityByRef(fixture.order.ref)).toBe(fixture.order);
		expect(ws.getValueObjectByRef(fixture.money.ref)).toBe(fixture.money);
		expect(ws.getConsumableByRef(fixture.orderPlaced.ref)).toBe(
			fixture.orderPlaced,
		);
		expect(ws.getConsumableByRef(fixture.placeOrder.ref)).toBe(
			fixture.placeOrder,
		);
		expect(
			ws.getInvariantByRef(`${fixture.orderAgg.ref}/invariants/non_empty`),
		).toBeDefined();
	});

	it("resolves schemas and the consumables that carry them", () => {
		expect(ws.getSchemaByRef(fixture.orderSummary.ref)).toBe(
			fixture.orderSummary,
		);
		expect(fixture.orderPlaced.schema).toBe(fixture.orderSummary);
		expect(fixture.orderPlaced.type).toBe("event");
		// Both ends count: the event carries the summary, and Place Order answers
		// with it. Order Request is only ever sent, so it lists one consumable.
		expect(fixture.orderSummary.consumables).toEqual([
			fixture.orderPlaced,
			fixture.placeOrder,
		]);
		expect(fixture.placeOrder.returns).toBe(fixture.orderSummary);
		expect(fixture.orderRequest.consumables).toEqual([fixture.placeOrder]);
		expect(fixture.orderSummary.attributes.get("total")?.valueobject).toBe(
			fixture.money,
		);
		expect(fixture.orderSummary.attributes.get("order_id")?.identity).toBe(
			true,
		);
		expect(() => ws.getSchemaByRefOrThrow("#/nope")).toThrow(/Schema/);
	});

	it("resolves operations and the events they raise", () => {
		expect(ws.getConsumableByRef(fixture.placeOrder.ref)).toBe(
			fixture.placeOrder,
		);
		expect(fixture.placeOrder.raisedEvents).toEqual([fixture.orderPlaced]);
		expect(fixture.placeOrder.schema).toBe(fixture.orderRequest);
		expect(fixture.invoiceRaised.internal).toBe(true);
		expect(fixture.orderPlaced.internal).toBe(false);
	});

	it("resolves attributes by ref through their owner", () => {
		const total = fixture.order.attributes.get("total");
		expect(ws.getAttributeByRef(total?.ref ?? "")).toBe(total);
		expect(
			ws.getAttributeByRef(`${fixture.orderSummary.ref}/attributes/total`),
		).toBe(fixture.orderSummary.attributes.get("total"));
		expect(ws.getAttributeByRef(fixture.order.ref)).toBeUndefined();
		expect(() => ws.getAttributeByRefOrThrow("#/x/attributes/y")).toThrow(
			/Attribute/,
		);
	});

	it("resolves what an invariant constrains", () => {
		expect(fixture.nonEmpty.targets).toEqual([
			fixture.orderLine,
			fixture.order.attributes.get("total"),
		]);
		expect(ws.getConstrainableByRef(fixture.orderLine.ref)).toBe(
			fixture.orderLine,
		);
		expect(() => ws.getConstrainableByRefOrThrow("#/nope")).toThrow(
			/Entity, Value Object, Attribute or Consumable/,
		);
		// An invariant may also be a rule about one of its aggregate's
		// operations, so a consumable ref resolves as something constrainable.
		expect(ws.getConstrainableByRef(fixture.raiseInvoice.ref)).toBe(
			fixture.raiseInvoice,
		);
	});

	it("resolves what makes a consumption", () => {
		expect(ws.getConsumptionCallerByRef(fixture.invoiceOnOrderPlaced.ref)).toBe(
			fixture.invoiceOnOrderPlaced,
		);
		expect(ws.getConsumptionCallerByRef(fixture.raiseInvoice.ref)).toBe(
			fixture.raiseInvoice,
		);
		// An aggregate is a node, not something that calls out on its own.
		expect(ws.getConsumptionCallerByRef(fixture.orderAgg.ref)).toBeUndefined();
		expect(() => ws.getConsumptionCallerByRefOrThrow("#/nope")).toThrow(
			/Consumable or Policy/,
		);
	});

	it("resolves policies and what they join", () => {
		expect(ws.getPolicyByRef(fixture.invoiceOnOrderPlaced.ref)).toBe(
			fixture.invoiceOnOrderPlaced,
		);
		expect(fixture.invoiceOnOrderPlaced.events).toEqual([fixture.orderPlaced]);
		expect(fixture.invoiceOnOrderPlaced.commands).toEqual([
			fixture.raiseInvoice,
		]);
		expect(() => ws.getPolicyByRefOrThrow("#/nope")).toThrow(/Policy/);
	});

	it("resolves glossary terms and what embodies them", () => {
		expect(ws.getTermByRef(fixture.orderTerm.ref)).toBe(fixture.orderTerm);
		expect(fixture.orderTerm.embodiedBy).toBe(fixture.orderAgg);
		expect(() => ws.getTermByRefOrThrow("#/nope")).toThrow(/Glossary term/);
	});

	it("resolves any ref by its shape", () => {
		for (const element of [
			fixture.sales,
			fixture.ordering,
			fixture.orderingBc,
			fixture.salesTeam,
			fixture.orderApp,
			fixture.orderAgg,
			fixture.order,
			fixture.money,
			fixture.nonEmpty,
			fixture.orderSummary,
			fixture.placeOrder,
			fixture.orderPlaced,
			fixture.invoiceOnOrderPlaced,
			fixture.orderTerm,
			fixture.order.attributes.get("total"),
		]) {
			expect(ws.getByRef(element?.ref ?? "")).toBe(element);
		}
		expect(ws.getByRef("#/unknown/x")).toBeUndefined();
		expect(() => ws.getByRefOrThrow("#/unknown/x")).toThrow(/Nothing found/);
	});

	it("resolves teams and derives what they own", () => {
		expect(ws.getTeamByRef(teamRef("sales_team").$ref)).toBe(fixture.salesTeam);
		expect(fixture.salesTeam.boundedcontexts).toEqual([fixture.orderingBc]);
		expect(() => ws.getTeamByRefOrThrow("#/teams/nope")).toThrow(/Team/);
	});

	it("dispatches polymorphic lookups on the ref shape", () => {
		expect(ws.getServiceOrAggregateByRef(fixture.orderAgg.ref)).toBe(
			fixture.orderAgg,
		);
		expect(ws.getServiceOrAggregateByRef(fixture.orderApp.ref)).toBe(
			fixture.orderApp,
		);
		expect(ws.getEntityOrValueobjectByRef(fixture.order.ref)).toBe(
			fixture.order,
		);
		expect(ws.getEntityOrValueobjectByRef(fixture.money.ref)).toBe(
			fixture.money,
		);
	});

	it("throws a descriptive error from every OrThrow variant", () => {
		const missing = "#/domains/nope";
		expect(() => ws.getDomainByRefOrThrow(missing)).toThrow(/Domain/);
		expect(() => ws.getSubdomainByRefOrThrow(missing)).toThrow(/Subdomain/);
		expect(() => ws.getBoundedContextByRefOrThrow(missing)).toThrow(
			/Bounded Context/,
		);
		expect(() => ws.getServiceByRefOrThrow(missing)).toThrow(/Service/);
		expect(() => ws.getAggregateByRefOrThrow(missing)).toThrow(/Aggregate/);
		expect(() => ws.getServiceOrAggregateByRefOrThrow(missing)).toThrow(
			/Service or Aggregate/,
		);
		expect(() => ws.getEntityByRefOrThrow(missing)).toThrow(/Entity/);
		expect(() => ws.getValueObjectByRefOrThrow(missing)).toThrow(
			/Value Object/,
		);
		expect(() => ws.getEntityOrValueobjectByRefOrThrow(missing)).toThrow(
			/Entity or Value Object/,
		);
		expect(() => ws.getInvariantByRefOrThrow(missing)).toThrow(/Invariant/);
		expect(() => ws.getConsumableByRefOrThrow(missing)).toThrow(/Consumable/);
	});

	it("honours explicit ids over name-derived ids", () => {
		const { ws } = makeRichTestWs();
		const domain = ws.addDomain("Whatever Name", {
			description: "",
			id: "stable",
		});
		expect(domain.ref).toBe("#/domains/stable");
		expect(ws.getDomainByRef("#/domains/stable")).toBe(domain);
	});

	it("keeps refs stable across renames when ids are explicit", () => {
		const { ws } = makeRichTestWs();
		const bc = ws.addBoundedContext("Old Name", {
			description: "",
			id: "stable_bc",
		});
		const agg = bc.addAggregate("Old Aggregate", {
			description: "",
			id: "agg",
		});
		const before = agg.ref;
		bc.name = "New Name";
		agg.name = "New Aggregate";
		expect(agg.ref).toBe(before);
		expect(ws.getAggregateByRef(before)).toBe(agg);
		expect(ws.toSchema().boundedcontexts.stable_bc.name).toBe("New Name");
	});

	it("uses the JSON object keys as ids when loading from schema", () => {
		const { ws } = makeRichTestWs();
		const schema = JSON.parse(JSON.stringify(ws.toSchema()));
		schema.boundedcontexts.renamed_key = schema.boundedcontexts.reporting_bc;
		delete schema.boundedcontexts.reporting_bc;
		schema.boundedcontexts.renamed_key.subdomains = [];
		// nothing else may point at the old key: not the relationships, and not
		// the ordering consumption that reads reporting's sales figures
		schema.relationships = [];
		schema.boundedcontexts.ordering_bc.services.order_app.consumes = [];
		// nor reporting's own raises link, whose ref carries the old key too
		schema.boundedcontexts.renamed_key.services.reporting_app.provides.compile_sales_figures.raises =
			[];
		const rebuilt = Workspace.fromSchema(schema);
		expect(
			rebuilt.getBoundedContextByRef("#/boundedcontexts/renamed_key")?.name,
		).toBe("Reporting BC");
		expect(
			rebuilt.getBoundedContextByRef("#/boundedcontexts/reporting_bc"),
		).toBeUndefined();
	});
});

describe("relationship refs", () => {
	const { ws, orderingBc, reportingBc } = makeRichTestWs();

	it("names a relationship by its two contexts and the pattern joining them", () => {
		const relationship = ws.addRelationship({
			type: "shared-kernel",
			participants: [orderingBc, reportingBc],
		});
		expect(relationship.ref).toBe(
			`#/relationships/${orderingBc.id}~shared-kernel~${reportingBc.id}`,
		);
		expect(relationship.path).toBe(relationship.ref.slice(2));
	});

	it("resolves a relationship ref back to the relationship", () => {
		const relationship = ws.addRelationship({
			type: "separate-ways",
			participants: [orderingBc, reportingBc],
		});
		expect(ws.findRelationship(relationship.ref)).toBe(relationship);
		expect(ws.findRelationship("#/relationships/nope~partnership~nope")).toBe(
			undefined,
		);
	});

	it("tells two relationships between the same pair apart by their type", () => {
		const supplier = ws.addRelationship({
			type: "customer-supplier",
			upstream: orderingBc,
			downstream: reportingBc,
		});
		const stream = ws.addRelationship({
			type: "upstream-downstream",
			upstream: orderingBc,
			downstream: reportingBc,
		});
		expect(supplier.ref).not.toBe(stream.ref);
		expect(ws.findRelationship(supplier.ref)).toBe(supplier);
		expect(ws.findRelationship(stream.ref)).toBe(stream);
	});
});
