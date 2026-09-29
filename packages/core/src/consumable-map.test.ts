import { describe, expect, it } from "vitest";
import { ODSConsumableMap } from "./consumable-map";
import { Workspace } from "./workspace";

/**
 * A warehouse downstream of a vendor system under two agreements, one
 * negotiated and one tolerated, with a consumption under each and a third that
 * names none (issue #55).
 */
function twoAgreements() {
	const ws = new Workspace("W", { description: "", version: "0" });
	const vendor = ws.addBoundedContext("Vendor", { description: "" });
	const warehouse = ws.addBoundedContext("Warehouse", { description: "" });
	const lookup = warehouse.downstreamOf(vendor, {
		name: "purchase order lookup",
		type: "customer-supplier",
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
	});
	const feed = warehouse.downstreamOf(vendor, {
		name: "legacy stock feed",
		upstreamRoles: ["published-language"],
		downstreamRoles: ["anti-corruption-layer"],
	});
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
	return { api, lookup, feed, getPo, received, ping };
}

describe("ODSConsumableMap agreements", () => {
	it("carries the agreement each consumption runs under, and none where it names none", () => {
		const { api, lookup, feed, getPo, received, ping } = twoAgreements();
		const edges = [...ODSConsumableMap.fromService(api).edges.values()];
		const agreementOf = (ref: string) =>
			edges.find((e) => e.target.id === ref)?.agreement;
		expect(edges).toHaveLength(3);
		expect(agreementOf(getPo.ref)).toEqual({
			name: "purchase order lookup",
			type: "customer-supplier",
			ref: lookup.ref,
		});
		expect(agreementOf(received.ref)).toEqual({
			name: "legacy stock feed",
			type: feed.type,
			ref: feed.ref,
		});
		expect(agreementOf(ping.ref)).toBeUndefined();
		expect(lookup.ref).not.toBe(feed.ref);
	});
});
