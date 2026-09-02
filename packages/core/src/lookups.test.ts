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

	it("resolves domain events and links published consumables to them", () => {
		expect(ws.getEventByRef(fixture.orderPlacedEvent.ref)).toBe(
			fixture.orderPlacedEvent,
		);
		expect(fixture.orderPlaced.event).toBe(fixture.orderPlacedEvent);
		expect(fixture.orderPlaced.type).toBe("event");
		expect(fixture.orderPlacedEvent.attributes.get("total")?.valueobject).toBe(
			fixture.money,
		);
		expect(fixture.orderPlacedEvent.attributes.get("order_id")?.identity).toBe(
			true,
		);
		expect(() => ws.getEventByRefOrThrow("#/nope")).toThrow(/Event/);
	});

	it("resolves commands, the events they raise, and the consumables exposing them", () => {
		expect(ws.getCommandByRef(fixture.placeOrderCommand.ref)).toBe(
			fixture.placeOrderCommand,
		);
		expect(fixture.placeOrderCommand.raisedEvents).toEqual([
			fixture.orderPlacedEvent,
		]);
		expect(fixture.placeOrder.command).toBe(fixture.placeOrderCommand);
		expect(() => ws.getCommandByRefOrThrow("#/nope")).toThrow(/Command/);
	});

	it("resolves attributes by ref through their owner", () => {
		const total = fixture.order.attributes.get("total");
		expect(ws.getAttributeByRef(total?.ref ?? "")).toBe(total);
		expect(
			ws.getAttributeByRef(`${fixture.orderPlacedEvent.ref}/attributes/total`),
		).toBe(fixture.orderPlacedEvent.attributes.get("total"));
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
			/Entity, Value Object or Attribute/,
		);
	});

	it("resolves policies and what they join", () => {
		expect(ws.getPolicyByRef(fixture.invoiceOnOrderPlaced.ref)).toBe(
			fixture.invoiceOnOrderPlaced,
		);
		expect(fixture.invoiceOnOrderPlaced.events).toEqual([
			fixture.orderPlacedEvent,
		]);
		expect(fixture.invoiceOnOrderPlaced.commands).toEqual([
			fixture.raiseInvoiceCommand,
		]);
		expect(() => ws.getPolicyByRefOrThrow("#/nope")).toThrow(/Policy/);
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

	it("uses the JSON object keys as ids when loading from schema", () => {
		const { ws } = makeRichTestWs();
		const schema = JSON.parse(JSON.stringify(ws.toSchema()));
		schema.boundedcontexts.renamed_key = schema.boundedcontexts.reporting_bc;
		delete schema.boundedcontexts.reporting_bc;
		schema.boundedcontexts.renamed_key.subdomains = [];
		// nothing else may point at the old key
		schema.relationships = [];
		const rebuilt = Workspace.fromSchema(schema);
		expect(
			rebuilt.getBoundedContextByRef("#/boundedcontexts/renamed_key")?.name,
		).toBe("Reporting BC");
		expect(
			rebuilt.getBoundedContextByRef("#/boundedcontexts/reporting_bc"),
		).toBeUndefined();
	});
});
