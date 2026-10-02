import { describe, expect, it } from "vitest";
import { ODSFlowMap } from "./flow-map";
import { type Consumable, Workspace } from "./workspace";

const CHAIN_LENGTH = 4_000;

/**
 * A long authored call chain, with each internal operation on its own service
 * so the service's sole operation is the inferred caller of the next one.
 */
function callChain(length: number, closesCycle = false) {
	const ws = new Workspace("Long flow", { description: "", version: "0" });
	const served = ws
		.addDomain("Business", { description: "" })
		.addSubdomain("Work", { description: "", type: "core" });
	const bc = ws.addBoundedContext("Work", { description: "" }).serves(served);
	const operations: Consumable[] = [];
	for (let index = 0; index < length; index += 1) {
		operations.push(
			bc
				.addService(`Step ${index} handler`, {
					description: "",
					type: "application",
				})
				.provides(`Step ${index}`, {
					description: "",
					type: "operation",
					internal: true,
				}),
		);
	}
	for (let index = 1; index < operations.length; index += 1)
		operations[index - 1]!.provider.consumes(operations[index]!);
	if (closesCycle)
		operations[operations.length - 1]!.provider.consumes(operations[0]!);
	bc.addProcess("Run", { description: "" })
		.starts(operations[0]!)
		.issues(operations[1]!)
		.ends(operations[operations.length - 1]!.completed());
	return ws;
}

const roundTripped = (ws: Workspace) =>
	Workspace.fromSchema(JSON.parse(JSON.stringify(ws.toSchema())));

describe("ODSFlowMap traversal depth", () => {
	it("draws an authored 4,000-operation chain from source and JSON", () => {
		const ws = callChain(CHAIN_LENGTH);
		for (const model of [ws, roundTripped(ws)]) {
			expect(model.validate()).toEqual([]);
			const map = ODSFlowMap.fromWorkspace(model);
			expect(map.nodes.size).toBe(4_001);
			expect(map.edges.size).toBe(4_003);
		}
	}, 30_000);

	it("keeps depth-first order and terminates a 4,000-operation cycle", () => {
		const small = callChain(4);
		expect(
			[...ODSFlowMap.fromWorkspace(small).edges.values()].map(
				(edge) =>
					`${edge.source.name} -> ${edge.target.name}${edge.kind ? ` (${edge.kind})` : ""}`,
			),
		).toEqual([
			"Step 0 -> Step 1",
			"Step 1 -> Step 2",
			"Step 2 -> Step 3",
			"Step 0 -> Run",
			"Run -> Step 1",
			"Step 0 -> Run (ends)",
			"Step 1 -> Run (ends)",
		]);

		const cycle = callChain(CHAIN_LENGTH, true);
		const map = ODSFlowMap.fromWorkspace(cycle);
		expect(map.nodes.size).toBe(4_001);
		expect(map.edges.size).toBe(4_004);
	});
});
