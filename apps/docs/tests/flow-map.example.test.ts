import { writeFileSync } from "node:fs";
import { ODSFlowMap, Workspace } from "@open-domain-specification/core";
import { flowMapToDigraph } from "@open-domain-specification/graphviz";
import { describe, expect, it } from "vitest";

const ws = new Workspace("eCommerce", {
	odsVersion: "1.0.0",
	description: "Flow map example",
	version: "0.1.0",
});
const ordering = ws.addBoundedContext("Ordering", { description: "" });
const order = ordering.addAggregate("Order", { description: "" });
const placed = order.provides("Order Placed", {
	description: "",
	type: "event",
	pattern: "published-language",
});
const approved = order.provides("Order Approved", {
	description: "",
	type: "event",
	internal: true,
});
const approve = order
	.provides("Approve Order", {
		description: "",
		type: "operation",
		internal: true,
	})
	.raises(approved);
const ship = ordering
	.addAggregate("Shipment", { description: "" })
	.provides("Create Shipment", {
		description: "",
		type: "operation",
		internal: true,
	});

ordering
	.addPolicy("Auto approve", { description: "" })
	.on(placed)
	.then(approve);
ordering
	.addPolicy("Ship when approved", { description: "" })
	.on(approved)
	.then(ship);

describe("Flow map", () => {
	it("renders the event → policy → operation chain", async () => {
		const digraph = flowMapToDigraph(ODSFlowMap.fromBoundedContext(ordering));
		const svg = await digraph.toSVG();
		writeFileSync("static/img/flow-map-example.svg", svg);
		expect(digraph.toDot()).toContain("Ship when approved");
	});
});
