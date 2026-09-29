import {
	application,
	type Case,
	operation,
	runCases,
	subscription,
	world,
} from "./rule-cases.support";

/**
 * Slice 3 of issue #57: the policy and process rules. Each pair is one builder
 * taking `hostile`; see `rule-cases.boundary.test.ts` for the shape.
 */

/**
 * One context with an operation that starts a process, an operation that
 * finishes it, and the event the finish raises: the process rules' clean
 * ground.
 */
function saga() {
	const { ws, context } = world();
	const bc = context("Orders");
	const app = application(bc);
	const start = operation(app, "Start", { internal: true });
	const done = app.provides("Done", { description: "", type: "event" });
	operation(app, "Finish", { internal: true }).raises(done);
	return { ws, context, bc, app, start, done };
}

/** One context with a policy that reacts to a fact of its own. */
function reaction() {
	const { ws, context } = world();
	const bc = context("Orders");
	const app = application(bc);
	const noted = app.provides("Noted", { description: "", type: "event" });
	operation(app, "Note", { internal: true }).raises(noted);
	const act = operation(app, "Act", { internal: true });
	return { ws, context, bc, app, noted, act };
}

const processCases: Case[] = [
	{
		rules: ["process-in-context"],
		name: "a process issues operations of its own context, not another's",
		fires: ["process-in-context"],
		build: (hostile) => {
			const { ws, context, bc, start, done } = saga();
			const up = context("Up");
			const ping = operation(application(up), "Ping", {
				pattern: "open-host-service",
			});
			const own = operation(application(bc, "Orders Steps"), "Step", {
				internal: true,
			});
			bc.addProcess("Fulfil", { description: "" })
				.starts(start)
				.issues(hostile ? ping : own)
				.ends(done);
			return ws;
		},
	},
	{
		rules: ["process-in-context"],
		name: "the command that starts a process is its own context's; an event that starts one may cross",
		// A process started by a neighbour's operation has a subscription and
		// no reactor under it too, which the event-started near-miss supplies.
		fires: ["process-in-context"],
		build: (hostile) => {
			const { ws, down, upApp, happened, downApp } = subscription();
			const done = downApp.provides("Done", { description: "", type: "event" });
			operation(downApp, "Finish", { internal: true }).raises(done);
			// The policy that came with the fixture is replaced by a process.
			down.policies.clear();
			const process = down.addProcess("Fulfil", { description: "" }).ends(done);
			const make = upApp.consumables.get("make");
			if (!make) throw new Error("no operation");
			// Up's operation, or Up's event: either is named, and the event is
			// taken in through the consumption below.
			process.starts(hostile ? make : happened).on(happened);
			downApp.consumes(happened, { pattern: "conformist", by: [process] });
			return ws;
		},
	},
	{
		rules: ["process-has-ends"],
		name: "a process names the event that completes an instance",
		fires: ["process-has-ends"],
		build: (hostile) => {
			const { ws, bc, start, done } = saga();
			const process = bc
				.addProcess("Fulfil", { description: "" })
				.starts(start);
			if (!hostile) process.ends(done);
			return ws;
		},
	},
	{
		rules: ["process-starts"],
		name: "a process names the event or operation that begins an instance",
		fires: ["process-starts"],
		build: (hostile) => {
			const { ws, bc, start, done } = saga();
			const process = bc.addProcess("Fulfil", { description: "" }).ends(done);
			if (!hostile) process.starts(start);
			return ws;
		},
	},
];

const policyCases: Case[] = [
	{
		rules: ["policy-in-context"],
		name: "a policy issues operations of its own context, not another's",
		fires: ["policy-in-context"],
		build: (hostile) => {
			const { ws, context, bc, noted, act } = reaction();
			const up = context("Up");
			const ping = operation(application(up), "Ping", {
				pattern: "open-host-service",
			});
			bc.addPolicy("Respond", { description: "" })
				.on(noted)
				.issues(hostile ? ping : act);
			return ws;
		},
	},
	{
		rules: ["policy-complete"],
		name: "a policy reacts to at least one event",
		fires: ["policy-complete"],
		build: (hostile) => {
			const { ws, bc, noted, act } = reaction();
			const policy = bc.addPolicy("Respond", { description: "" }).issues(act);
			if (!hostile) policy.on(noted);
			return ws;
		},
	},
	{
		rules: ["policy-complete"],
		name: "a policy issues at least one operation",
		fires: ["policy-complete"],
		build: (hostile) => {
			const { ws, bc, noted, act } = reaction();
			const policy = bc.addPolicy("Respond", { description: "" }).on(noted);
			if (!hostile) policy.issues(act);
			return ws;
		},
	},
];

runCases(
	"rule cases: processes and policies",
	["processes-and-policies"],
	[...processCases, ...policyCases],
);
