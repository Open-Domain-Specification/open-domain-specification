import { ODSConsumableMap, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { consumableMapToDigraph } from "./consumable-map";

/**
 * A warehouse downstream of a vendor system under two agreements, with a
 * consumption under each and a third that names none (issue #55).
 */
function twoAgreements() {
	const ws = new Workspace("W", { description: "", version: "0" });
	const vendor = ws.addBoundedContext("Vendor", { description: "" });
	const warehouse = ws.addBoundedContext("Warehouse", { description: "" });
	const lookup = warehouse.downstreamOf(vendor, {
		name: "purchase order lookup",
		type: "customer-supplier",
	});
	const feed = warehouse.downstreamOf(vendor, { name: "legacy stock feed" });
	const gateway = vendor.addService("Gateway", {
		description: "",
		type: "application",
	});
	const getPo = gateway.provides("Get PO", {
		description: "",
		type: "operation",
	});
	const received = gateway.provides("PO Received", {
		description: "",
		type: "event",
		pattern: "published-language",
	});
	const ping = gateway.provides("Ping", { description: "", type: "operation" });
	const api = warehouse.addService("Warehouse API", {
		description: "",
		type: "application",
	});
	api.consumes(getPo, { relationship: lookup });
	api.consumes(received, { relationship: feed });
	api.consumes(ping);
	return api;
}

const dotOf = (api: ReturnType<typeof twoAgreements>) =>
	consumableMapToDigraph(ODSConsumableMap.fromService(api)).toDot();

describe("consumable map agreements", () => {
	it("stacks the agreement under the consumable name and hovers to it, where one is named", () => {
		const dot = dotOf(twoAgreements());
		expect(dot).toContain('label = "Get PO\\npurchase order lookup";');
		expect(dot).toContain(
			'tooltip = "Under the purchase order lookup agreement";',
		);
		expect(dot).toContain('label = "PO Received\\nlegacy stock feed";');
		expect(dot).toContain('tooltip = "Under the legacy stock feed agreement";');
	});

	it("leaves a consumption that names none labelled by its consumable alone", () => {
		const dot = dotOf(twoAgreements());
		expect(dot).toContain('label = "Ping";');
		expect(dot.match(/tooltip = "Under the/g)).toHaveLength(2);
	});

	it("names an agreement by its type where it has no name", () => {
		const ws = new Workspace("W", { description: "", version: "0" });
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const rel = down.downstreamOf(up, { type: "customer-supplier" });
		const op = up
			.addService("Up API", { description: "", type: "application" })
			.provides("Read", { description: "", type: "operation" });
		const api = down.addService("Down API", {
			description: "",
			type: "application",
		});
		api.consumes(op, { relationship: rel });
		expect(dotOf(api)).toContain("Under the customer-supplier agreement");
	});
});
