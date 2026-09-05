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
	bc.addPolicy("Auto approve", { description: "" }).on(placed).issues(approve);
	return { ws, bc, order, placed };
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

	it("draws a process as its own shape, with what ends it on a dashed edge", () => {
		const { ws, bc, order, placed } = makeWorkspace();
		const shipped = order.provides("OrderShipped", {
			type: "event",
			description: "",
		});
		const ship = order
			.provides("ShipOrder", {
				type: "operation",
				internal: true,
				description: "",
			})
			.raises(shipped);
		bc.addProcess("Order to shipment", { description: "" })
			.starts(placed)
			.issues(ship)
			.ends(shipped);
		const dot = flowMapToDigraph(ODSFlowMap.fromBoundedContext(bc)).toDot();
		expect(dot).toContain("Order to shipment");
		// The policy keeps the note; the process is the folder that outlives it.
		expect(dot).toContain('shape = "folder"');
		expect(dot).toContain('shape = "note"');
		// What ends an instance is not something the process does, so the edge
		// says so rather than reading as one more step (decision 23).
		expect(dot).toMatch(/label = "ends"/);
		expect(dot).toMatch(/style = "dashed"/);
		expect(ws.validate().map((d) => d.rule)).not.toContain("process-has-ends");
	});

	it("labels an answer with the shape it came back as", () => {
		const { ws, bc, order, placed } = makeWorkspace();
		const credit = ws.addBoundedContext("Credit", { description: "" });
		const creditApp = credit.addService("Credit App", {
			description: "",
			type: "application",
		});
		const verdict = credit.addSchema("CreditVerdict");
		const score = creditApp.provides("ScoreOrder", {
			type: "operation",
			pattern: "open-host-service",
			description: "",
			returns: verdict,
		});
		const ask = order.provides("AskForScore", {
			type: "operation",
			internal: true,
			description: "",
		});
		order.consumes(score, { pattern: "conformist", by: [ask] });
		bc.addProcess("Order to approval", { description: "" })
			.starts(placed)
			.on(verdict)
			.issues(ask)
			.ends(placed);
		const dot = flowMapToDigraph(ODSFlowMap.fromWorkspace(ws)).toDot();
		// The answer is a step, drawn from the operation that answered and named
		// by the shape, so the reader sees which answer woke the process.
		expect(dot).toMatch(/label = "CreditVerdict"/);
		expect(dot).toContain("ScoreOrder");
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
