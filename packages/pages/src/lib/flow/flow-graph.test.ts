import {
	ODSFlowMap,
	type ODSFlowMapEdge,
	type ODSFlowMapNode,
	Workspace,
} from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import { ICONS } from "../icons";
import {
	ENDS_LABEL,
	type FlowNodeData,
	flowGraph,
	stepIcon,
} from "./flow-graph";

const ws = { id: "ws", name: "Petstore" };
const sales = { id: "#/boundedcontexts/sales_bc", name: "Sales" };
const order = {
	id: "#/boundedcontexts/sales_bc/aggregates/order",
	name: "Order",
};

const process: ODSFlowMapNode = {
	id: "#/boundedcontexts/sales_bc/processes/order_fulfilment",
	name: "Order fulfilment",
	description: "From placed to sold.",
	type: "process",
	namespace: [ws, sales],
};
const placed: ODSFlowMapNode = {
	id: `${order.id}/provides/order_placed`,
	name: "OrderPlaced",
	type: "event",
	namespace: [ws, sales, order],
};
const approve: ODSFlowMapNode = {
	id: `${order.id}/provides/approve_order`,
	name: "ApproveOrder",
	type: "command",
	namespace: [ws, sales, order],
};
const delivered: ODSFlowMapNode = {
	id: `${order.id}/provides/order_delivered`,
	name: "OrderDelivered",
	type: "event",
	namespace: [ws, sales, order],
};
const policy: ODSFlowMapNode = {
	id: "#/boundedcontexts/sales_bc/policies/recount",
	name: "Recount on change",
	type: "policy",
	namespace: [ws, sales],
};

const edges: [string, ODSFlowMapEdge][] = [
	["e1", { source: placed, target: process }],
	["e2", { source: process, target: approve }],
	["e3", { source: process, target: delivered, kind: "ends" }],
];
const map = {
	nodes: new Map(
		[process, placed, approve, delivered, policy].map((n) => [n.id, n]),
	),
	edges: new Map(edges),
} as unknown as ODSFlowMap;

describe("flowGraph", () => {
	it("draws one node per step, typed flow, with the kind's icon and the provider's cluster path", () => {
		const g = flowGraph(map);
		const nodes = g.nodes as FlowNodeData[];
		expect(nodes.map((n) => n.type)).toEqual(Array(5).fill("flow"));
		expect(nodes[0]).toEqual({
			id: process.id,
			type: "flow",
			label: "Order fulfilment",
			kind: "process",
			description: "From placed to sold.",
			icon: ICONS.process,
			step: "process",
			groupPath: "Sales",
			groupId: "cluster:#/boundedcontexts/sales_bc",
		});
		// A consumable clusters under the provider that offers it, so a step
		// reached elsewhere reads as belonging over there.
		expect(nodes[1].groupPath).toBe("Sales / Order");
		expect(nodes[1].groupId).toBe(`cluster:${order.id}`);
		expect(nodes[1].step).toBe("event");
		expect(nodes[2].step).toBe("command");
		expect(nodes[4].step).toBe("policy");
		// A screen reader hears the step in the words the pages use: an
		// operation, not the metamodel's "command".
		expect(nodes.map((n) => n.kind)).toEqual([
			"process",
			"event",
			"operation",
			"event",
			"policy",
		]);
		// Nothing is focused unless the page asks for it.
		expect(nodes.some((n) => n.focus)).toBe(false);
		expect(g.groups).toEqual([
			{ id: "cluster:ws", label: "Petstore", parent: undefined },
			{
				id: "cluster:#/boundedcontexts/sales_bc",
				label: "Sales",
				parent: "cluster:ws",
			},
			{
				id: `cluster:${order.id}`,
				label: "Order",
				parent: "cluster:#/boundedcontexts/sales_bc",
			},
		]);
	});

	it("draws a step as a plain arrow and what completes a process as a dashed 'ends' arrow", () => {
		expect(flowGraph(map).edges).toEqual([
			{
				id: "e1",
				type: "flow",
				source: placed.id,
				target: process.id,
				directed: true,
			},
			{
				id: "e2",
				type: "flow",
				source: process.id,
				target: approve.id,
				directed: true,
			},
			{
				id: "e3",
				type: "flow",
				source: process.id,
				target: delivered.id,
				directed: true,
				dashed: true,
				label: ENDS_LABEL,
			},
		]);
	});

	it("marks the page's own reaction and nothing else", () => {
		const nodes = flowGraph(map, process.id).nodes as FlowNodeData[];
		expect(nodes.filter((n) => n.focus).map((n) => n.id)).toEqual([process.id]);
	});

	it("has no group for a step with an empty namespace", () => {
		const lone = { ...policy, namespace: [] };
		const g = flowGraph({
			nodes: new Map([[lone.id, lone]]),
			edges: new Map(),
		} as unknown as ODSFlowMap);
		expect(g.nodes[0].groupId).toBeUndefined();
		expect(g.nodes[0].groupPath).toBeUndefined();
		expect(g.groups).toEqual([]);
	});

	// The extension, the viewer and the static export draw core's map edge for
	// edge, so a process answered along a direct and an indirect call shows
	// both answers arriving (issue #108, twentieth review).
	it("draws every answer route core's map carries", () => {
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
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(start!)
			.issues(direct!, indirect!)
			.ends(query!.returned());
		const answers = flowGraph(ODSFlowMap.fromBoundedContext(bc))
			.edges.filter((e) => e.answer && e.target === run.ref)
			.map((e) => [e.source, e.label]);
		expect(answers).toEqual([
			[direct!.ref, "Fact (ends)"],
			[indirect!.ref, "Fact (ends)"],
		]);
	});

	// The extension, the viewer and the static export draw both of Run's
	// answers through Front: the one it waits on as a step and the one that
	// ends it dashed, and two that would read alike by the call each answers
	// (issue #108, twenty-second review).
	it("keeps each answer through one front, in its role, told apart", () => {
		const ws = new Workspace("Flow", { description: "", version: "0" });
		const bc = ws.addBoundedContext("Orders", { description: "" });
		const receipt = bc.addSchema("Receipt");
		const op = (name: string, returns = false) =>
			bc
				.addService(`${name} Handler`, {
					description: "",
					type: "application",
				})
				.provides(name, {
					description: "",
					type: "operation",
					internal: true,
					...(returns && { returns: receipt }),
				});
		const first = op("First", true);
		const second = op("Second", true);
		const last = op("Last");
		const front = op("Front");
		for (const called of [first, second, last]) front.provider.consumes(called);
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(op("Begin"))
			.on(first.returned(), second.returned(), last.completed())
			.issues(front)
			.ends(last.completed());
		const answers = flowGraph(ODSFlowMap.fromBoundedContext(bc))
			.edges.filter((e) => e.answer && e.target === run.ref)
			.map((e) => [e.source, e.label, e.dashed ?? false]);
		expect(answers).toEqual([
			[front.ref, "First returns Receipt", false],
			[front.ref, "Second returns Receipt", false],
			[front.ref, "completes", false],
			[front.ref, "completes (ends)", true],
		]);
	});

	// The same, read back from JSON, where two refusals share an id and a
	// name: both are drawn, each named by its shape's context.
	it("draws both same-named refusals of one call, told apart by context", () => {
		const ws = kernelPair(true);
		const run = ws.getByRef("#/boundedcontexts/local/processes/run")!;
		const answers = flowGraph(ODSFlowMap.fromWorkspace(ws))
			.edges.filter((e) => e.answer && e.target === run.ref)
			.map((e) => e.label)
			.sort();
		expect(answers).toEqual([
			"Local / Handler / Charge rejects with Foreign / Decline",
			"Local / Handler / Charge rejects with Local / Decline",
		]);
	});

	it("picks the codicon each host already uses for the step", () => {
		expect(stepIcon("event")).toBe(ICONS.event);
		expect(stepIcon("command")).toBe(ICONS.command);
		expect(stepIcon("policy")).toBe(ICONS.policy);
		expect(stepIcon("process")).toBe(ICONS.process);
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
