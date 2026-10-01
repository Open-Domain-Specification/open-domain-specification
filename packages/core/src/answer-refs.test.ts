import { describe, expect, it } from "vitest";
import { flowEdgeLabel, ODSFlowMap } from "./flow-map";
import { distinguish } from "./trigger-readings";
import { type DataSchema, Workspace } from "./workspace";

/**
 * An answer's ref names exactly one answer, and reads back as that answer
 * (issue #108, identity audit before the twenty-third review).
 *
 * A refusal was named by its shape's id alone, and an id is only unique inside
 * the shape's own context. An operation refusing with its own `decline` and a
 * kernel-shared `decline` from next door gave both refusals one ref, the
 * process waiting on both wrote that ref twice, and reading the JSON back kept
 * one of them: a zero-diagnostic model lost a refusal it plainly declares.
 */

/**
 * Local and Foreign share a kernel, and each declares a refusal shape whose id
 * is `decline`. Charge, in Local, refuses with both; Run waits on both and
 * ends when Charge's own Done is raised. `reasons` gives both shapes the same
 * enumerated outcomes.
 */
function kernel({ reasons = [] as string[], sameName = false } = {}) {
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
	const mine = shape(local, "LocalRefusal");
	const theirs = shape(foreign, "ForeignRefusal");
	const handler = local.addService("Handler", {
		description: "",
		type: "application",
	});
	const start = handler.provides("Start", {
		description: "",
		type: "event",
		internal: true,
	});
	const done = handler.provides("Done", {
		description: "",
		type: "event",
		internal: true,
	});
	handler
		.provides("Seed", { description: "", type: "operation", internal: true })
		.raises(start);
	const charge = handler
		.provides("Charge", {
			description: "",
			type: "operation",
			internal: true,
			rejects: [mine, theirs].map((schema) => ({ schema, reasons })),
		})
		.raises(done);
	const answers = [mine, theirs].flatMap((schema) => [
		charge.rejected(schema),
		...reasons.map((reason) => charge.rejected(schema, reason)),
	]);
	const run = local
		.addProcess("Run", { description: "" })
		.starts(start)
		.issues(charge)
		.on(...answers)
		.ends(done);
	return { ws, charge, mine, theirs, run, answers };
}

const roundTripped = (ws: Workspace) =>
	Workspace.fromSchema(JSON.parse(JSON.stringify(ws.toSchema())));

/** Each answer Run waits on, as which shape of which context, and which reason. */
const waits = (ws: Workspace) =>
	[...ws.boundedcontexts.get("local")!.processes.get("run")!.events].map(
		(answer) =>
			"schema" in answer
				? [
						answer.ref,
						(answer.schema as DataSchema | undefined)?.ref,
						"reason" in answer ? answer.reason : undefined,
					]
				: [answer.ref],
	);

describe("an answer's ref names one answer", () => {
	it("keeps a local and a kernel-shared refusal of one id apart, through JSON", () => {
		const { ws, mine, theirs } = kernel();
		const back = roundTripped(ws);
		expect(ws.validate()).toEqual([]);
		expect(back.validate()).toEqual([]);
		expect(waits(back)).toEqual(waits(ws));
		expect(waits(ws).map(([, schema]) => schema)).toEqual([
			mine.ref,
			theirs.ref,
		]);
		expect(new Set(waits(ws).map(([ref]) => ref)).size).toBe(2);
		// Lossless: the model read back writes the same JSON.
		expect(back.toSchema()).toEqual(ws.toSchema());
	});

	it("keeps every reason of both refusals apart, reasons that need escaping too", () => {
		const reasons = ["insufficient_funds", "a/b", "c~d", "a~1b", "with space"];
		const { ws, answers } = kernel({ reasons });
		const back = roundTripped(ws);
		expect(back.validate()).toEqual([]);
		expect(waits(back)).toEqual(waits(ws));
		expect(new Set(answers.map((it) => it.ref)).size).toBe(answers.length);
		for (const answer of answers)
			expect(ws.getAnswerByRef(answer.ref)).toBe(answer);
		expect(back.toSchema()).toEqual(ws.toSchema());
	});

	it("resolves every answer after a slash-bearing operation id, through JSON", () => {
		for (const kind of ["completion", "return", "refusal"] as const) {
			const { ws, mine } = kernel({
				reasons: ["ordinary", "completed", "returns"],
			});
			const handler = ws.boundedcontexts.get("local")!.services.get("handler")!;
			const operation = handler.provides("Run", {
				id: "run/part",
				description: "",
				type: "operation",
				internal: true,
				...(kind === "return" && { returns: mine }),
				...(kind === "refusal" && {
					rejects: [
						{ schema: mine, reasons: ["ordinary", "completed", "returns"] },
					],
				}),
			});
			const refs =
				kind === "completion"
					? [operation.completed().ref]
					: kind === "return"
						? [operation.returned().ref]
						: [
								operation.rejected(mine).ref,
								...operation.rejections[0]!.reasons.map(
									(reason) => operation.rejected(mine, reason).ref,
								),
							];
			for (const model of [ws, roundTripped(ws)]) {
				expect(model.getConsumableByRef(operation.ref)?.ref).toBe(
					operation.ref,
				);
				for (const ref of refs) {
					expect(model.getAnswerByRef(ref)?.ref).toBe(ref);
					expect(model.getByRef(ref)?.ref).toBe(ref);
				}
			}
		}
	});

	// The flow map draws both refusals after JSON, and where even their
	// origins read alike, names each shape by the context it belongs to.
	it("draws both refusals, named by context where their names collide", () => {
		for (const sameName of [false, true]) {
			const { ws, run } = kernel({ sameName });
			const back = roundTripped(ws);
			expect(back.validate()).toEqual([]);
			const drawn = [...ODSFlowMap.fromWorkspace(back).edges.values()]
				.filter((edge) => edge.target.id === run.ref && edge.answer)
				.map((edge) => [
					edge.source.name,
					flowEdgeLabel(edge),
					edge.answer?.schema,
				])
				.sort();
			expect(drawn).toEqual(
				sameName
					? [
							[
								"Charge",
								"Local / Handler / Charge rejects with Foreign / Decline",
								"#/boundedcontexts/foreign/schemas/decline",
							],
							[
								"Charge",
								"Local / Handler / Charge rejects with Local / Decline",
								"#/boundedcontexts/local/schemas/decline",
							],
						]
					: [
							[
								"Charge",
								"ForeignRefusal",
								"#/boundedcontexts/foreign/schemas/decline",
							],
							[
								"Charge",
								"LocalRefusal",
								"#/boundedcontexts/local/schemas/decline",
							],
						],
			);
		}
	});

	// Ids and refusal reasons that read like collections or answer words are
	// still data in their declared position.
	it("resolves shapes, contexts and reasons that read like ref keywords", () => {
		const ws = new Workspace("Words", { description: "", version: "0" });
		const bc = ws.addBoundedContext("Provides", { description: "" });
		const handler = bc.addService("Handler", {
			description: "",
			type: "application",
		});
		for (const id of ["rejects", "returns", "completed"]) {
			const operation = handler.provides(id, {
				id,
				description: "",
				type: "operation",
				internal: true,
			});
			expect(ws.getConsumableByRef(operation.ref)).toBe(operation);
			expect(ws.getByRef(operation.ref)).toBe(operation);
		}
		const words = ["provides", "rejects", "returns", "completed"].map((id) => {
			const schema = bc.addSchema(id, { id });
			schema.addAttribute("why", { type: "string" });
			return schema;
		});
		const charge = handler.provides("Charge", {
			description: "",
			type: "operation",
			internal: true,
			rejects: words.map((schema) => ({
				schema,
				reasons: ["ordinary", "completed", "returns"],
			})),
		});
		for (const schema of words)
			for (const answer of [
				charge.rejected(schema),
				charge.rejected(schema, "ordinary"),
				charge.rejected(schema, "completed"),
				charge.rejected(schema, "returns"),
			]) {
				expect(ws.getAnswerByRef(answer.ref)).toBe(answer);
				expect(ws.getByRef(answer.ref)).toBe(answer);
			}
	});

	// What does not name an answer resolves to nothing, and the loader reports
	// it rather than throwing.
	it("resolves no answer for a malformed or unknown ref", () => {
		const { ws, charge } = kernel({ reasons: ["late"] });
		const at = charge.ref;
		for (const ref of [
			`${at}/rejects/decline`,
			`${at}/rejects/local`,
			`${at}/rejects/nowhere/decline`,
			`${at}/rejects/local/nothing`,
			`${at}/rejects/local/decline/never`,
			`${at}/rejects/local/decline/late/extra`,
			`${at}/rejects/local/decline/~2`,
			`${at}/rejects/`,
			`${at}/rejected`,
			`${at.replace("charge", "nothing")}/rejects/local/decline`,
		]) {
			expect(ws.getAnswerByRef(ref)).toBeUndefined();
			expect(ws.getByRef(ref)).toBeUndefined();
		}
		const json = ws.toSchema();
		const run = json.boundedcontexts.local!.processes!.run!;
		run.on = [{ $ref: `${at}/rejects/decline` }, ...(run.on ?? []).slice(1)];
		const back = Workspace.fromSchema(JSON.parse(JSON.stringify(json)));
		expect(back.validate().map((d) => d.rule)).toContain("unresolved-ref");
	});

	// The empty string is no reason at all, in the DSL and in JSON alike.
	it("reads an empty reason as the refusal itself, the same both ways", () => {
		const { ws, charge, mine } = kernel({ reasons: [""] });
		expect(charge.rejected(mine, "")).toBe(charge.rejected(mine));
		expect(waits(roundTripped(ws))).toEqual(waits(ws));
	});
});

/**
 * Every list of triggers reads its own names, told apart by the same readings
 * where two would read the same (issue #108). Asserted on the model read
 * back from JSON, as the readers draw it.
 */
describe("distinguish reads alike triggers apart, and only those", () => {
	const named = (ws: Workspace) => {
		const run = ws.boundedcontexts.get("local")!.processes.get("run")!;
		return run.events.map(
			distinguish(
				run.events,
				(it) => it.name,
				(it) => it,
			),
		);
	};

	it("keeps distinct names and qualifies same-name refusals by context", () => {
		expect(named(roundTripped(kernel().ws))).toEqual([
			"LocalRefusal",
			"ForeignRefusal",
		]);
		expect(named(roundTripped(kernel({ sameName: true }).ws))).toEqual([
			"Local / Handler / Charge rejects with Local / Decline",
			"Local / Handler / Charge rejects with Foreign / Decline",
		]);
	});

	it("reads completions by their call, and same-name timers by their anchor", () => {
		const { ws } = kernel();
		const local = ws.boundedcontexts.get("local")!;
		const handler = local.services.get("handler")!;
		const op = (name: string) =>
			handler.provides(name, {
				description: "",
				type: "operation",
				internal: true,
			});
		const [first, last] = [op("First"), op("Last")];
		const run = local.processes.get("run")!;
		run.issues(first!, last!).on(first!.completed(), last!.completed());
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
		const back = roundTripped(ws);
		expect(back.validate()).toEqual([]);
		expect(named(back)).toEqual([
			"LocalRefusal",
			"ForeignRefusal",
			"First completes",
			"Last completes",
			"Late: after 1 day from First completes",
			"Late: after 1 day from Last completes",
		]);
	});
});
