import { ODSFlowMap, Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { flowMapToDigraph } from "./flow-map";
import { graphIdentifier } from "./identifier";

function makeWorkspace() {
	const ws = new Workspace("Flow", {
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
	it.each([
		["newline", "a\nb", "a\\nb"],
		["NUL", "a\0b", "a\\0b"],
	])(
		"keeps %s and its literal escape identity distinct after source and JSON loading",
		async (_case, aId, bId) => {
			const source = new Workspace("Unsafe identities", {
				description: "",
				version: "0",
			});
			const served = source
				.addDomain("Business", { description: "" })
				.addSubdomain("Work", { description: "", type: "core" });
			const bc = source
				.addBoundedContext("Work", { description: "" })
				.serves(served);
			const service = bc.addService("Handler", {
				description: "",
				type: "application",
			});
			const operation = (name: string, id: string) =>
				service.provides(name, {
					id,
					description: "",
					type: "operation",
					internal: true,
				});
			const begin = operation("Begin", "begin");
			const a = operation("A", aId);
			const b = operation("B", bId);
			bc.addProcess("Run", { description: "" })
				.starts(begin)
				.issues(a, b)
				.ends(b.completed());

			for (const workspace of [
				source,
				Workspace.fromSchema(JSON.parse(JSON.stringify(source.toSchema()))),
			]) {
				expect(workspace.validate()).toEqual([]);
				const map = ODSFlowMap.fromWorkspace(workspace);
				expect(map.nodes.size).toBe(4);
				expect(map.edges.size).toBe(4);
				const drawn = flowMapToDigraph(map);
				const dot = drawn.toDot();
				for (const ref of [a.ref, b.ref])
					expect(dot).toContain(`"${graphIdentifier(ref)}" [`);
				expect(dot.match(/ -> /g)).toHaveLength(4);
				const svg = await drawn.toSVG();
				expect(svg.match(/class="node"/g)).toHaveLength(4);
				expect(svg.match(/class="edge"/g)).toHaveLength(4);
			}
		},
	);

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
			.on(score.returned())
			.issues(ask)
			.ends(placed);
		const dot = flowMapToDigraph(ODSFlowMap.fromWorkspace(ws)).toDot();
		// The answer is a step, drawn from the operation that answered and named
		// by the shape, so the reader sees which answer woke the process.
		expect(dot).toMatch(/label = "CreditVerdict"/);
		expect(dot).toContain("ScoreOrder");
	});

	// Markdown's flow map is this digraph of this context's map, so the SVG
	// it writes carries every route an answer comes home by, not the first
	// kind found (issue #108, twentieth review).
	it("draws an answer home along a direct and an indirect call alike", async () => {
		const ws = new Workspace("Routes", { description: "", version: "0" });
		const bc = ws.addBoundedContext("Orders", { description: "" });
		const fact = bc.addSchema("Fact");
		const app = bc.addService("Orders App", {
			description: "",
			type: "application",
		});
		const [start, direct, indirect, middle, query] = [
			"Start",
			"Direct",
			"Indirect",
			"Middle",
			"Query",
		].map((name) =>
			app.provides(name, {
				description: "",
				type: "operation",
				internal: true,
				...(name === "Query" && { returns: fact }),
			}),
		);
		app.consumes(query!, { by: [direct!, middle!] });
		app.consumes(middle!, { by: [indirect!] });
		bc.addProcess("Run", { description: "" })
			.starts(start!)
			.issues(direct!, indirect!)
			.ends(query!.returned());
		const digraph = flowMapToDigraph(ODSFlowMap.fromBoundedContext(bc));
		expect(digraph.toDot().match(/label = "Fact \(ends\)"/g)).toHaveLength(2);
		expect((await digraph.toSVG()).match(/Fact \(ends\)/g)).toHaveLength(2);
	});

	// The reviewer's model: Run waits on First's completion and ends on
	// Last's, both through Front. The digraph Markdown writes keeps both, the
	// ending one dashed (issue #108, twenty-second review).
	it("draws an ordinary and an ending completion through one front", async () => {
		const ws = new Workspace("Flow", { description: "", version: "0" });
		const bc = ws.addBoundedContext("Orders", { description: "" });
		const op = (name: string) =>
			bc
				.addService(`${name} Handler`, {
					description: "",
					type: "application",
				})
				.provides(name, {
					description: "",
					type: "operation",
					internal: true,
				});
		const [first, last, front, begin] = ["First", "Last", "Front", "Begin"].map(
			op,
		);
		front!.provider.consumes(first!);
		front!.provider.consumes(last!);
		bc.addProcess("Run", { description: "" })
			.starts(begin!)
			.on(first!.completed())
			.issues(front!)
			.ends(last!.completed());
		const digraph = flowMapToDigraph(ODSFlowMap.fromBoundedContext(bc));
		const dot = digraph.toDot();
		expect(dot).toMatch(/label = "completes"/);
		expect(dot).toMatch(
			/style = "dashed"[^\]]*label = "completes \(ends\)"|label = "completes \(ends\)"[^\]]*style = "dashed"/,
		);
		const svg = await digraph.toSVG();
		expect(svg.match(/>completes</g)).toHaveLength(1);
		expect(svg.match(/>completes \(ends\)</g)).toHaveLength(1);
	});

	// A local and a kernel-shared refusal share an id and a name: read back
	// from JSON, both are drawn, each named by its shape's context.
	it("draws both same-named refusals of one call, told apart by context", async () => {
		const ws = kernelPair(true);
		const digraph = flowMapToDigraph(ODSFlowMap.fromWorkspace(ws));
		const dot = digraph.toDot();
		const svg = await digraph.toSVG();
		for (const label of [
			"Local / Handler / Charge rejects with Foreign / Decline",
			"Local / Handler / Charge rejects with Local / Decline",
		]) {
			expect(dot).toContain(`label = "${label}"`);
			expect(svg).toContain(`>${label}<`);
		}
	});

	it("draws mutually anchored deadlines without expanding their chains", async () => {
		const source = mutualDeadlineAnchors();
		for (const workspace of [
			source,
			Workspace.fromSchema(JSON.parse(JSON.stringify(source.toSchema()))),
		]) {
			expect(workspace.validate()).toEqual([]);
			const digraph = flowMapToDigraph(ODSFlowMap.fromWorkspace(workspace));
			const dot = digraph.toDot();
			const svg = await digraph.toSVG();
			for (const label of ["after 1 day from A", "after 1 day from B"]) {
				expect(dot).toContain(`label = "${label}"`);
				expect(svg).toContain(`>${label}<`);
			}
		}
	});

	it("renders an empty map without throwing", async () => {
		const ws = new Workspace("Empty", {
			description: "",
			version: "0.0.1",
		});
		const svg = await flowMapToDigraph(ODSFlowMap.fromWorkspace(ws)).toSVG();
		expect(svg).toContain("<svg");
	});
});

function kernelPair(sameName: boolean) {
	const ws = new Workspace("Refs", { description: "", version: "0" });
	const served = ws
		.addDomain("Payments", { description: "" })
		.addSubdomain("Charging", { description: "", type: "core" });
	const local = ws
		.addBoundedContext("Local", { description: "" })
		.serves(served);
	const foreign = ws
		.addBoundedContext("Foreign", { description: "" })
		.serves(served);
	local.sharesKernelWith(foreign);
	const shape = (owner: typeof local, name: string) => {
		const schema = owner.addSchema(sameName ? "Decline" : name, {
			id: "decline",
		});
		schema.addAttribute("why", { type: "string" });
		return schema;
	};
	const refusals = [
		shape(local, "LocalRefusal"),
		shape(foreign, "ForeignRefusal"),
	];
	const handler = local.addService("Handler", {
		description: "",
		type: "application",
	});
	const event = (name: string) =>
		handler.provides(name, { description: "", type: "event", internal: true });
	const start = event("Start");
	const done = event("Done");
	handler
		.provides("Seed", { description: "", type: "operation", internal: true })
		.raises(start);
	const charge = handler
		.provides("Charge", {
			description: "",
			type: "operation",
			internal: true,
			rejects: refusals,
		})
		.raises(done);
	local
		.addProcess("Run", { description: "" })
		.starts(start)
		.issues(charge)
		.on(...refusals.map((it) => charge.rejected(it)))
		.ends(done);
	// Read back from JSON, so the readers draw what the file says.
	return Workspace.fromSchema(JSON.parse(JSON.stringify(ws.toSchema())));
}

function mutualDeadlineAnchors() {
	const ws = new Workspace("Timers", { description: "", version: "0" });
	const served = ws
		.addDomain("Delivery", { description: "" })
		.addSubdomain("Orders", { description: "", type: "core" });
	const bc = ws.addBoundedContext("Orders", { description: "" }).serves(served);
	const app = bc.addService("Handler", {
		description: "",
		type: "application",
	});
	const event = (name: string) =>
		app.provides(name, { description: "", type: "event", internal: true });
	const start = event("Start");
	const done = event("Done");
	app
		.provides("Seed", { description: "", type: "operation", internal: true })
		.raises(start);
	const act = app
		.provides("Act", { description: "", type: "operation", internal: true })
		.raises(done);
	const run = bc
		.addProcess("Run", { description: "" })
		.starts(start)
		.issues(act)
		.ends(done);
	const a = run.addDeadline("A", { description: "", after: "1 day" });
	const b = run.addDeadline("B", { description: "", after: "1 day" });
	run.on(a, b);
	a.countsFrom(b);
	b.countsFrom(a);
	return ws;
}
