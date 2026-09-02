import { ODSFlowMap, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { flowMapToDigraph } from "./flow-map";

function makeWorkspace() {
	const ws = new Workspace("Flow", {
		odsVersion: "1.0.0",
		description: "",
		version: "0.0.1",
	});
	const bc = ws.addBoundedContext("Ordering", { description: "" });
	const order = bc.addAggregate("Order", { description: "" });
	const placed = order.provides("OrderPlaced", {
		type: "event",
		pattern: "published-language",
		description: "",
	});
	const approve = order
		.provides("ApproveOrder", {
			type: "operation",
			internal: true,
			description: "",
		})
		.raises(placed);
	bc.addPolicy("Auto approve", { description: "" }).on(placed).then(approve);
	return { ws, bc };
}

describe("flowMapToDigraph", () => {
	it("renders events, policies and commands with their edges", () => {
		const { bc } = makeWorkspace();
		const dot = flowMapToDigraph(ODSFlowMap.fromBoundedContext(bc)).toDot();
		expect(dot).toContain("OrderPlaced");
		expect(dot).toContain("Auto approve");
		expect(dot).toContain("ApproveOrder");
		expect(dot).toContain('shape = "note"');
		expect(dot).toContain("->");
	});

	it("renders an empty map without throwing", async () => {
		const ws = new Workspace("Empty", {
			odsVersion: "1.0.0",
			description: "",
			version: "0.0.1",
		});
		const svg = await flowMapToDigraph(ODSFlowMap.fromWorkspace(ws)).toSVG();
		expect(svg).toContain("<svg");
	});
});
