import { describe, expect, it } from "vitest";
import { makeRichTestWs } from "./makeTestWs";
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
		schema.boundedcontexts.renamed_key = schema.boundedcontexts.invoicing_bc;
		delete schema.boundedcontexts.invoicing_bc;
		schema.boundedcontexts.renamed_key.subdomains = [];
		const rebuilt = Workspace.fromSchema(schema);
		expect(
			rebuilt.getBoundedContextByRef("#/boundedcontexts/renamed_key")?.name,
		).toBe("Invoicing BC");
		expect(
			rebuilt.getBoundedContextByRef("#/boundedcontexts/invoicing_bc"),
		).toBeUndefined();
	});
});
