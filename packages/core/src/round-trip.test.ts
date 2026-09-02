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
			"#/domains/sales/subdomains/ordering/boundedcontexts/ordering_bc",
		);
		expect(bc.description).toBe("Ordering bounded context");
	});

	it("re-links consumptions to live objects", () => {
		const invoiceAgg = rebuilt.getAggregateByRefOrThrow(
			"#/domains/billing/subdomains/invoicing/boundedcontexts/invoicing_bc/aggregates/invoice",
		);
		expect(invoiceAgg.consumptions).toHaveLength(1);
		const consumption = invoiceAgg.consumptions[0];
		expect(consumption.consumable.name).toBe("Order Placed");
		expect(consumption.consumable.consumptions).toContain(consumption);
		expect(consumption.consumable.provider.name).toBe("Order");
	});

	it("re-links entity relations across aggregates", () => {
		const invoice = rebuilt.getEntityByRefOrThrow(
			"#/domains/billing/subdomains/invoicing/boundedcontexts/invoicing_bc/aggregates/invoice/entities/invoice",
		);
		expect(invoice.root).toBe(true);
		expect(invoice.relations).toHaveLength(1);
		expect(invoice.relations[0].target.name).toBe("Order");
		expect(invoice.relations[0].relation).toBe("references");
		expect(invoice.relations[0].label).toBe("bills");
	});
});
