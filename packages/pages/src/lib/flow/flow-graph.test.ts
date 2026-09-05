import type {
	ODSFlowMap,
	ODSFlowMapEdge,
	ODSFlowMapNode,
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

	it("picks the codicon each host already uses for the step", () => {
		expect(stepIcon("event")).toBe(ICONS.event);
		expect(stepIcon("command")).toBe(ICONS.command);
		expect(stepIcon("policy")).toBe(ICONS.policy);
		expect(stepIcon("process")).toBe(ICONS.process);
	});
});
