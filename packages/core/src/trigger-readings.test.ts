import { describe, expect, it } from "vitest";
import { flowEdgeLabel, ODSFlowMap } from "./flow-map";
import { triggerReading } from "./trigger-readings";
import { type Deadline, type ProcessTrigger, Workspace } from "./workspace";

/**
 * Run has two valid deadlines whose clocks start on each other. The validator
 * deliberately has no acyclicity rule for deadline anchors; every reader must
 * therefore present the immediate anchor without walking an unbounded chain.
 */
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
	return { ws, run };
}

const roundTripped = (ws: Workspace) =>
	Workspace.fromSchema(JSON.parse(JSON.stringify(ws.toSchema())));

describe("trigger readings", () => {
	it("names the immediate deadline anchor without expanding its anchor", () => {
		const { ws } = mutualDeadlineAnchors();
		for (const model of [ws, roundTripped(ws)]) {
			expect(model.validate()).toEqual([]);
			const run = model.boundedcontexts.get("orders")!.processes.get("run")!;
			const a = run.deadlines.get("a")!;
			const b = run.deadlines.get("b")!;

			expect(triggerReading(a, "origin")).toBe(
				"A: after 1 day from B: after 1 day",
			);
			expect(triggerReading(a, "context")).toBe(
				"A (a): after 1 day from B (b): after 1 day",
			);
			expect(triggerReading(a, "ref")).toBe(a.ref);
			expect(triggerReading(b, "origin")).toBe(
				"B: after 1 day from A: after 1 day",
			);

			const carried = [...ODSFlowMap.fromWorkspace(model).edges.values()]
				.filter((edge) => edge.target.id === run.ref && edge.deadline)
				.map((edge) => [edge.deadline?.ref, flowEdgeLabel(edge)])
				.sort((left, right) => left[0]!.localeCompare(right[0]!));
			expect(carried).toEqual([
				[a.ref, "after 1 day from B"],
				[b.ref, "after 1 day from A"],
			]);
		}
	});

	it("reads a deep authored deadline chain in constant stack depth", () => {
		const { run } = mutualDeadlineAnchors();
		let anchor: ProcessTrigger = run.startEvents[0]!;
		let latest: Deadline | undefined;
		for (let index = 0; index < 10_000; index++) {
			latest = run.addDeadline(`Limit ${index}`, {
				id: `limit_${index}`,
				description: "",
				after: "1 hour",
			});
			run.on(latest);
			latest.countsFrom(anchor);
			anchor = latest;
		}
		expect(triggerReading(latest!, "origin")).toBe(
			"Limit 9999: after 1 hour from Limit 9998: after 1 hour",
		);
	});
});
