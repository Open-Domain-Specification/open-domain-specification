import { Workspace } from "@open-domain-specification/core";
import { render } from "@testing-library/svelte";
import { describe, expect, it } from "vitest";
import Harness from "../Page.harness.svelte";

/**
 * The extension, the viewer and the static export name each trigger by itself
 * in every list, and where two would read the same they are named the way the
 * flow map names them (issue #108, identity audit before the twenty-third
 * review). The model is the audit's: a local and a kernel-shared refusal shape
 * of one id and one name, refused by one call, read back from JSON; with two
 * same-named timers of one length counting from two calls' completions.
 */
function kernel() {
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
	const refusals = [local, foreign].map((owner) => {
		const schema = owner.addSchema("Decline", { id: "decline" });
		schema.addAttribute("why", { type: "string" });
		return schema;
	});
	const handler = local.addService("Handler", {
		description: "",
		type: "application",
	});
	const provides = (name: string, type: "event" | "operation") =>
		handler.provides(name, { description: "", type, internal: true });
	const start = provides("Start", "event");
	const done = provides("Done", "event");
	provides("Seed", "operation").raises(start);
	const [first, last] = [
		provides("First", "operation"),
		provides("Last", "operation"),
	];
	const charge = handler
		.provides("Charge", {
			description: "",
			type: "operation",
			internal: true,
			rejects: refusals,
		})
		.raises(done);
	const answers = refusals.map((it) => charge.rejected(it));
	const run = local
		.addProcess("Run", { description: "" })
		.starts(start)
		.issues(charge, first!, last!)
		.on(...answers, first!.completed(), last!.completed())
		.ends(done);
	for (const [id, from] of [
		["late_first", first!],
		["late_last", last!],
	] as const)
		run.on(
			run.addDeadline("Late", {
				id,
				description: "",
				after: "1 day",
				from: from.completed(),
			}),
		);
	local
		.addPolicy("Retry", { description: "" })
		.on(start, ...answers)
		.issues(charge);
	const workspace = Workspace.fromSchema(
		JSON.parse(JSON.stringify(ws.toSchema())),
	);
	return {
		workspace,
		fileLabel: "refs.json",
		diagnostics: workspace.validate(),
	};
}

const LOCAL = "#/boundedcontexts/local/schemas/decline";
const FOREIGN = "#/boundedcontexts/foreign/schemas/decline";
const REFUSED_LOCAL = "Local / Handler / Charge rejects with Local / Decline";
const REFUSED_FOREIGN =
	"Local / Handler / Charge rejects with Foreign / Decline";

const draw = (ref: string) =>
	render(Harness, { model: kernel(), ref }).container;

const drawWorkspace = (workspace: Workspace, ref: string) =>
	render(Harness, {
		model: {
			workspace,
			fileLabel: "timers.json",
			diagnostics: workspace.validate(),
		},
		ref,
	}).container;

/** Each first-column cell of a table: its text, and the ref it links to. */
const named = (container: HTMLElement, table: string) =>
	[...container.querySelectorAll(`#${table} tbody tr`)].map((row) => {
		const cell = row.querySelector("td");
		return [
			cell?.textContent?.replace(/\s+/g, " ").trim(),
			cell?.querySelector("a[data-ref]")?.getAttribute("data-ref"),
		];
	});

describe("trigger lists tell same-named triggers apart", () => {
	it("renders mutually anchored deadlines from source and JSON", () => {
		const source = mutualDeadlineAnchors();
		for (const workspace of [
			source,
			Workspace.fromSchema(JSON.parse(JSON.stringify(source.toSchema()))),
		]) {
			expect(workspace.validate()).toEqual([]);
			const rows = named(
				drawWorkspace(workspace, "#/boundedcontexts/orders/processes/run"),
				"when",
			);
			expect(rows.map(([label]) => label)).toEqual([
				"A after 1 day from B",
				"B after 1 day from A",
			]);
		}
	});

	it("names each refusal and timer in a process's table by what it is", () => {
		const rows = named(draw("#/boundedcontexts/local/processes/run"), "when");
		expect(rows).toEqual([
			[REFUSED_LOCAL, LOCAL],
			[REFUSED_FOREIGN, FOREIGN],
			["completes", "#/boundedcontexts/local/services/handler/provides/first"],
			["completes", "#/boundedcontexts/local/services/handler/provides/last"],
			[
				"Late: after 1 day from First completes",
				"#/boundedcontexts/local/processes/run",
			],
			[
				"Late: after 1 day from Last completes",
				"#/boundedcontexts/local/processes/run",
			],
		]);
	});

	it("names each refusal in a policy's table by what it is", () => {
		const rows = named(draw("#/boundedcontexts/local/policies/retry"), "when");
		expect(rows.slice(1)).toEqual([
			[REFUSED_LOCAL, LOCAL],
			[REFUSED_FOREIGN, FOREIGN],
		]);
	});

	it("names them apart in the context page's lists too", () => {
		const text = draw("#/boundedcontexts/local").textContent ?? "";
		for (const label of [
			REFUSED_LOCAL,
			REFUSED_FOREIGN,
			"First completes",
			"Last completes",
			"Late: after 1 day from First completes",
			"Late: after 1 day from Last completes",
		])
			expect(text).toContain(label);
	});
});

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
