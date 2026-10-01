import { describe, expect, it } from "vitest";
import { flowEdgeLabel, ODSFlowMap, type ODSFlowMapEdge } from "./flow-map";
import { type Consumable, Workspace } from "./workspace";

/**
 * One flow-map edge per distinct step (issue #108, twenty-second review).
 *
 * The map kept the first edge drawn between two nodes under each label, so a
 * process waiting on one call's completion and ending on another's, both
 * through one front, lost its ending edge behind the ordinary one: both read
 * "completes" from the front. What an edge is, is its two ends, whether it
 * completes the instance, and the answer or timer it carries; its label is
 * how it reads. Each case asserts the edges the map keeps, source and JSON.
 */

/**
 * One context whose operations each sit on a service of their own, so a
 * silent consumption infers its caller. `Front` calls `First` and `Last`;
 * `shape` makes both return `Receipt` rather than nothing.
 */
function shop(shape?: "Receipt") {
	const ws = new Workspace("Flow", { description: "", version: "0" });
	const served = ws
		.addDomain("Selling", { description: "" })
		.addSubdomain("Orders", { description: "", type: "core" });
	const bc = ws.addBoundedContext("Orders", { description: "" }).serves(served);
	const receipt = bc.addSchema("Receipt");
	receipt.addAttribute("ok", { type: "boolean" });
	const op = (name: string, extra: Record<string, unknown> = {}) =>
		bc
			.addService(`${name} Handler`, { description: "", type: "application" })
			.provides(name, {
				description: "",
				type: "operation",
				internal: true,
				...extra,
			});
	const returning = shape ? { returns: receipt } : {};
	const first = op("First", returning);
	const last = op("Last", returning);
	const front = op("Front");
	front.provider.consumes(first);
	front.provider.consumes(last);
	const begin = op("Begin");
	const answer = (operation: Consumable) =>
		shape ? operation.returned() : operation.completed();
	return { ws, bc, op, first, last, front, begin, receipt, answer };
}

const roundTripped = (ws: Workspace) =>
	Workspace.fromSchema(JSON.parse(JSON.stringify(ws.toSchema())));

/** The answer and timer edges into a reactor, as identity and as read. */
function carried(ws: Workspace, into: { ref: string }) {
	return Array.from(ODSFlowMap.fromWorkspace(ws).edges.values())
		.filter((edge) => edge.target.id === into.ref)
		.filter((edge) => edge.answer || edge.deadline)
		.map((edge) => ({
			from: edge.source.name,
			role: edge.kind ?? "step",
			carries: edge.answer
				? [
						edge.answer.operation.split("/").pop(),
						edge.answer.outcome,
						edge.answer.schema?.split("/").pop(),
						edge.answer.reason,
					]
						.filter(Boolean)
						.join(" ")
				: edge.deadline?.ref.split("/").pop(),
			label: flowEdgeLabel(edge),
		}))
		.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
}

function expectCarried(
	ws: Workspace,
	into: { ref: string },
	expected: ReturnType<typeof carried>,
	diagnostics: string[] = [],
) {
	for (const model of [ws, roundTripped(ws)]) {
		expect(model.validate().map((d) => d.rule)).toEqual(diagnostics);
		expect(carried(model, into)).toEqual(
			[...expected].sort((a, b) =>
				JSON.stringify(a).localeCompare(JSON.stringify(b)),
			),
		);
	}
}

describe("ODSFlowMap keeps one edge per distinct step", () => {
	// The reviewer's assertion, on labels alone.
	it("draws both the ordinary and the ending completion through one front", () => {
		const { ws, bc, first, last, front, begin } = shop();
		bc.addProcess("Run", { description: "" })
			.starts(begin)
			.on(first.completed())
			.issues(front)
			.ends(last.completed());
		for (const model of [ws, roundTripped(ws)]) {
			expect(model.validate()).toEqual([]);
			const labels = [...ODSFlowMap.fromWorkspace(model).edges.values()]
				.filter((edge) => edge.answer)
				.map(flowEdgeLabel)
				.sort();
			expect(labels).toEqual(["completes", "completes (ends)"]);
		}
	});

	// The reviewer's model, and the same with both returning one shape.
	for (const shape of [undefined, "Receipt"] as const)
		it(`keeps an ordinary answer and an ending one through one front (${shape ?? "completion"})`, () => {
			const { ws, bc, first, last, front, begin, answer } = shop(shape);
			const run = bc
				.addProcess("Run", { description: "" })
				.starts(begin)
				.on(answer(first))
				.issues(front)
				.ends(answer(last));
			const name = shape ?? "completes";
			const outcome = shape ? "returns" : "completes";
			expectCarried(ws, run, [
				{
					from: "Front",
					role: "step",
					carries: `first ${outcome}${shape ? " receipt" : ""}`,
					label: name,
				},
				{
					from: "Front",
					role: "ends",
					carries: `last ${outcome}${shape ? " receipt" : ""}`,
					label: `${name} (ends)`,
				},
			]);
		});

	// Two answers reading the same from the same front are two steps, and the
	// labels say which call each came back from.
	it("keeps two ordinary answers of one shape apart, named by their origin", () => {
		const { ws, bc, first, last, front, begin } = shop("Receipt");
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(begin)
			.on(first.returned(), last.returned())
			.issues(front)
			.ends(front.completed());
		expectCarried(ws, run, [
			{
				from: "Front",
				role: "step",
				carries: "first returns receipt",
				label: "First returns Receipt",
			},
			{
				from: "Front",
				role: "step",
				carries: "last returns receipt",
				label: "Last returns Receipt",
			},
			{
				from: "Front",
				role: "ends",
				carries: "front completes",
				label: "completes (ends)",
			},
		]);
	});

	// An answer named in both `on` and `ends` is drawn in both roles, whatever
	// order they are declared in.
	for (const endsFirst of [false, true])
		it(`keeps an answer both waited on and ending in both roles, ends declared ${endsFirst ? "first" : "second"}`, () => {
			const { ws, bc, first, front, begin } = shop();
			const run = bc
				.addProcess("Run", { description: "" })
				.starts(begin)
				.issues(front);
			if (endsFirst) run.ends(first.completed()).on(first.completed());
			else run.on(first.completed()).ends(first.completed());
			expectCarried(ws, run, [
				{
					from: "Front",
					role: "step",
					carries: "first completes",
					label: "completes",
				},
				{
					from: "Front",
					role: "ends",
					carries: "first completes",
					label: "completes (ends)",
				},
			]);
		});

	// A success and a refusal of one shape, and refusals by reason, are each
	// their own answer.
	it("keeps success, refusal and each refusal reason of one shape apart", () => {
		const { ws, bc, op, begin, receipt } = shop();
		const query = op("Query", {
			returns: receipt,
			rejects: [{ schema: receipt, reasons: ["late", "lost"] }],
		});
		const asking = op("Ask");
		asking.provider.consumes(query);
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(begin)
			.on(
				query.returned(),
				query.rejected(receipt),
				query.rejected(receipt, "late"),
				query.rejected(receipt, "lost"),
			)
			.issues(asking)
			.ends(asking.completed());
		expectCarried(ws, run, [
			{
				from: "Ask",
				role: "step",
				carries: "query returns receipt",
				label: "Query returns Receipt",
			},
			{
				from: "Ask",
				role: "step",
				carries: "query rejects receipt",
				label: "Query rejects with Receipt",
			},
			{
				from: "Ask",
				role: "step",
				carries: "query rejects receipt late",
				label: "Receipt (late)",
			},
			{
				from: "Ask",
				role: "step",
				carries: "query rejects receipt lost",
				label: "Receipt (lost)",
			},
			{
				from: "Ask",
				role: "ends",
				carries: "ask completes",
				label: "completes (ends)",
			},
		]);
	});

	// A call made directly and the same call through a front are two roots.
	it("keeps an answer through a direct call and through a front", () => {
		const { ws, bc, first, front, begin } = shop();
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(begin)
			.on(first.completed())
			.issues(first, front)
			.ends(front.completed());
		expectCarried(ws, run, [
			{
				from: "First",
				role: "step",
				carries: "first completes",
				label: "completes",
			},
			{
				from: "Front",
				role: "step",
				carries: "first completes",
				label: "completes",
			},
			{
				from: "Front",
				role: "ends",
				carries: "front completes",
				label: "completes (ends)",
			},
		]);
	});

	// Two timers of one length, each anchored on an answer that reads
	// "completes", are two timers; so are two unanchored ones, and one timer
	// waited on and ending.
	it("keeps timers apart by which timer they are, and in both roles", () => {
		const { ws, bc, first, last, front, begin } = shop();
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(begin)
			.on(first.completed(), last.completed())
			.issues(front);
		const early = run.addDeadline("Early", {
			description: "",
			after: "1 day",
			from: first.completed(),
		});
		const late = run.addDeadline("Late", {
			description: "",
			after: "1 day",
			from: last.completed(),
		});
		const quiet = run.addDeadline("Quiet", {
			description: "",
			after: "1 week",
		});
		const idle = run.addDeadline("Idle", { description: "", after: "1 week" });
		run.on(early, late, quiet).ends(idle, quiet);
		expectCarried(ws, run, [
			{
				from: "Front",
				role: "step",
				carries: "first completes",
				label: "First completes",
			},
			{
				from: "Front",
				role: "step",
				carries: "last completes",
				label: "Last completes",
			},
			{
				from: "Run",
				role: "step",
				carries: "early",
				label: "Early: after 1 day from First completes",
			},
			{
				from: "Run",
				role: "step",
				carries: "late",
				label: "Late: after 1 day from Last completes",
			},
			{ from: "Run", role: "step", carries: "quiet", label: "after 1 week" },
			{
				from: "Run",
				role: "ends",
				carries: "idle",
				label: "Idle: after 1 week (ends)",
			},
			{
				from: "Run",
				role: "ends",
				carries: "quiet",
				label: "Quiet: after 1 week (ends)",
			},
		]);
	});

	// Two timers may share a name and a length under ids of their own; each
	// is its own loop, read by what its clock counts from.
	it("keeps two same-named timers of one length apart by their anchors", () => {
		const { ws, bc, first, last, front, begin } = shop();
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(begin)
			.on(first.completed(), last.completed())
			.issues(front);
		const late = (id: string, from: typeof first) =>
			run.addDeadline("Late", {
				id,
				description: "",
				after: "1 day",
				from: from.completed(),
			});
		run.on(late("late_first", first)).ends(late("late_last", last));
		run.on(run.deadlines.get("late_last")!);
		expectCarried(ws, run, [
			{
				from: "Front",
				role: "step",
				carries: "first completes",
				label: "First completes",
			},
			{
				from: "Front",
				role: "step",
				carries: "last completes",
				label: "Last completes",
			},
			{
				from: "Run",
				role: "step",
				carries: "late_first",
				label: "Late: after 1 day from First completes",
			},
			{
				from: "Run",
				role: "step",
				carries: "late_last",
				label: "Late: after 1 day from Last completes",
			},
			{
				from: "Run",
				role: "ends",
				carries: "late_last",
				label: "after 1 day from completes (ends)",
			},
		]);
	});

	// A reason the contract states with a separator in it is still one part
	// of one key, so no two answers' edges can share an id.
	it("keeps answers whose reasons hold separators apart, through JSON", () => {
		const { ws, bc, op, begin, receipt } = shop();
		const reasons = ["a|b", "a", "b", "a/b", "%7C"];
		const query = op("Query", { rejects: [{ schema: receipt, reasons }] });
		const asking = op("Ask");
		asking.provider.consumes(query);
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(begin)
			.on(...reasons.map((reason) => query.rejected(receipt, reason)))
			.issues(asking)
			.ends(asking.completed());
		for (const model of [ws, roundTripped(ws)]) {
			expect(model.validate()).toEqual([]);
			const answers = [
				...ODSFlowMap.fromWorkspace(model).edges.entries(),
			].filter(
				([, edge]) => edge.target.id === run.ref && edge.answer && !edge.kind,
			);
			expect(answers.map(([, edge]) => edge.answer?.reason).sort()).toEqual(
				[...reasons].sort(),
			);
			expect(new Set(answers.map(([id]) => id)).size).toBe(reasons.length);
			expect(new Set(answers.map(([, edge]) => flowEdgeLabel(edge))).size).toBe(
				reasons.length,
			);
		}
	});

	// Two operations of one name on two services answer through one front
	// with one shape; their origins read alike, so each is named by the
	// service that offers it.
	it("names two same-named operations' answers by the service offering each", () => {
		const { ws, bc, begin, receipt } = shop();
		const charge = (service: string) =>
			bc
				.addService(service, { description: "", type: "application" })
				.provides("Charge", {
					description: "",
					type: "operation",
					internal: true,
					returns: receipt,
				});
		const cards = charge("Cards");
		const wallet = charge("Wallet");
		const front = bc
			.addService("Checkout", { description: "", type: "application" })
			.provides("Pay", { description: "", type: "operation", internal: true });
		front.provider.consumes(cards);
		front.provider.consumes(wallet);
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(begin)
			.on(cards.returned(), wallet.returned())
			.issues(front)
			.ends(front.completed());
		expectCarried(ws, run, [
			{
				from: "Pay",
				role: "step",
				carries: "charge returns receipt",
				label: "Orders / Cards / Charge returns Orders / Receipt",
			},
			{
				from: "Pay",
				role: "step",
				carries: "charge returns receipt",
				label: "Orders / Wallet / Charge returns Orders / Receipt",
			},
			{
				from: "Pay",
				role: "ends",
				carries: "pay completes",
				label: "completes (ends)",
			},
		]);
	});

	// The same step drawn twice is one edge.
	it("keeps one edge for one step added twice", () => {
		const { ws, bc, first, front, begin } = shop();
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(begin)
			.on(first.completed())
			.issues(front)
			.ends(front.completed());
		const map = ODSFlowMap.fromWorkspace(ws);
		const step = [...map.edges.values()].find(
			(edge) => edge.target.id === run.ref && edge.answer && !edge.kind,
		) as ODSFlowMapEdge;
		const size = map.edges.size;
		expect(map.addEdge({ ...step, answer: { ...step.answer! } })).toBe(step);
		expect(map.edges.size).toBe(size);
	});
});
