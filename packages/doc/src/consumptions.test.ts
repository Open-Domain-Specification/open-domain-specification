import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { toDoc } from "./index";

/**
 * A warehouse downstream of a vendor system under two agreements, with a
 * consumption under each and a third that names none (issue #55).
 */
function twoAgreements({ named = true } = {}) {
	const ws = new Workspace("W", { description: "d", version: "0" });
	const shop = ws.addDomain("Shop", { description: "d" });
	const trade = shop.addSubdomain("Trade", { type: "core", description: "d" });
	const vendor = trade.addBoundedcontext("Vendor", { description: "d" });
	const warehouse = trade.addBoundedcontext("Warehouse", { description: "d" });
	const lookup = warehouse.downstreamOf(vendor, {
		name: "purchase order lookup",
		type: "customer-supplier",
	});
	const feed = warehouse.downstreamOf(vendor, { name: "legacy stock feed" });
	const gateway = vendor.addService("Gateway", {
		description: "d",
		type: "application",
	});
	const getPo = gateway.provides("Get PO", {
		description: "d",
		type: "operation",
	});
	const received = gateway.provides("PO Received", {
		description: "d",
		type: "event",
		pattern: "published-language",
	});
	const ping = gateway.provides("Ping", {
		description: "d",
		type: "operation",
	});
	const api = warehouse.addService("Warehouse API", {
		description: "d",
		type: "application",
	});
	api.consumes(getPo, named ? { relationship: lookup } : {});
	api.consumes(received, named ? { relationship: feed } : {});
	api.consumes(ping);
	return ws;
}

const page = (docs: Record<string, string>, suffix: string) => {
	const key = Object.keys(docs).find((k) => k.endsWith(suffix));
	if (!key) throw new Error(`no page ends with ${suffix}`);
	return docs[key];
};

describe("the agreement an exchange runs under, in Markdown", () => {
	it("adds an Agreement bullet after the provider on a consumption that names one, and none on one that does not", async () => {
		const docs = await toDoc(twoAgreements());
		const service = page(docs, "warehouse_api/index.md");
		const section = (name: string) =>
			service.split(`### ${name}`)[1].split("### ")[0];
		expect(section("Get PO")).toMatch(
			/- \*\*Provider\*\*: .*\n- \*\*Agreement\*\*: purchase order lookup\n/,
		);
		expect(section("PO Received")).toContain(
			"- **Agreement**: legacy stock feed",
		);
		expect(section("Ping")).not.toContain("Agreement");
	});

	it("renders a consumption heading without trailing whitespace when it has no pattern", async () => {
		const service = page(
			await toDoc(twoAgreements()),
			"warehouse_api/index.md",
		);
		expect(service).toContain("### Ping\nd");
		expect(service).not.toContain("### Ping \n");
	});

	const cells = (row: string) =>
		row
			.split("|")
			.slice(1, -1)
			.map((c) => c.trim());
	const tableOf = (docs: Record<string, string>, suffix: string) =>
		page(docs, suffix).split("## Consumptions")[1].trim().split("\n");

	it("adds an Agreement column to the context's consumptions table, with a dash where none is named", async () => {
		const table = tableOf(await toDoc(twoAgreements()), "warehouse/index.md");
		expect(cells(table[0])).toEqual([
			"Consumer",
			"Made By",
			"Consumed As",
			"Agreement",
			"Provider",
			"Consumable",
			"Provided As",
		]);
		const agreementOf = (consumable: string) =>
			cells(table.find((r) => cells(r)[5] === consumable) ?? "")[3];
		expect(agreementOf("Get PO")).toBe("purchase order lookup");
		expect(agreementOf("PO Received")).toBe("legacy stock feed");
		expect(agreementOf("Ping")).toBe("-");
	});

	it.each([
		["domain", "shop/index.md"],
		["subdomain", "trade/index.md"],
	])(
		"adds the same column to the %s's consumptions table, after Consumed As",
		async (_level, suffix) => {
			const table = tableOf(await toDoc(twoAgreements()), suffix);
			expect(cells(table[0])).toEqual([
				"Consumer",
				"Consumed As",
				"Agreement",
				"Provider",
				"Consumable",
				"Provided As",
			]);
			const agreementOf = (consumable: string) =>
				cells(table.find((r) => cells(r)[4] === consumable) ?? "")[2];
			expect(agreementOf("Get PO")).toBe("purchase order lookup");
			expect(agreementOf("PO Received")).toBe("legacy stock feed");
			expect(agreementOf("Ping")).toBe("-");
		},
	);

	it.each([
		["context", "warehouse/index.md"],
		["domain", "shop/index.md"],
		["subdomain", "trade/index.md"],
	])(
		"leaves the %s's consumptions table without the column where no row names an agreement",
		async (_level, suffix) => {
			const table = tableOf(
				await toDoc(twoAgreements({ named: false })),
				suffix,
			);
			expect(cells(table[0])).not.toContain("Agreement");
			expect(table).toHaveLength(5);
		},
	);
});
