import {
	aggregate,
	application,
	type Case,
	operation,
	runCases,
	world,
} from "./rule-cases.support";

/**
 * Slice 4 of issue #57: the rules about raising events. Each pair is one
 * builder taking `hostile`; see `rule-cases.boundary.test.ts` for the shape.
 */

/**
 * A context of two aggregates, Order and Stock. Stock publishes `Reserved` and
 * raises it from `Reserve`; Order publishes `Placed` and raises it from
 * `Confirm`. The events' own raisers are there so that nothing is reported as
 * never raised, whichever way a case points an operation.
 */
function warehouse() {
	const { ws, context } = world();
	const bc = context("Sales");
	const order = aggregate(bc, "Order");
	const stock = aggregate(bc, "Stock");
	const reserved = stock.agg.provides("Reserved", {
		description: "",
		type: "event",
	});
	const reserve = operation(stock.agg, "Reserve", { internal: true }).raises(
		reserved,
	);
	const placed = order.agg.provides("Placed", {
		description: "",
		type: "event",
	});
	operation(order.agg, "Confirm", { internal: true }).raises(placed);
	return { ws, context, bc, order, stock, reserved, reserve, placed };
}

const eventCases: Case[] = [
	{
		rules: ["raises-in-context"],
		name: "an operation raises an event its own context provides, not another's",
		fires: ["raises-in-context"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			const upApp = application(up);
			const theirs = upApp.provides("Happened", {
				description: "",
				type: "event",
			});
			operation(upApp, "Make", { internal: true }).raises(theirs);
			const downApp = application(down);
			const ours = downApp.provides("Noted", {
				description: "",
				type: "event",
			});
			operation(downApp, "Restate", { internal: true }).raises(
				hostile ? theirs : ours,
			);
			// Noted is raised by something in either case, so it is never a
			// second finding.
			if (hostile) operation(downApp, "Note", { internal: true }).raises(ours);
			return ws;
		},
	},
	{
		rules: ["raises-in-aggregate"],
		name: "an aggregate's operation raises its own event, not another aggregate's",
		fires: ["raises-in-aggregate"],
		build: (hostile) => {
			const { ws, order, reserved, placed } = warehouse();
			operation(order.agg, "Place", { internal: true }).raises(
				hostile ? reserved : placed,
			);
			return ws;
		},
	},
	{
		rules: ["raises-in-aggregate"],
		name: "a domain service raises no aggregate's event; an application service may raise any of its context's",
		fires: ["raises-in-aggregate"],
		build: (hostile) => {
			const { ws, bc, reserved } = warehouse();
			const front = bc.addService("Front", {
				description: "",
				type: hostile ? "domain" : "application",
			});
			operation(front, "Place", { internal: true }).raises(reserved);
			return ws;
		},
	},
	{
		rules: ["raises-restated"],
		name: "an operation does not restate an event the operation it calls already raises",
		fires: ["raises-restated"],
		build: (hostile) => {
			const { ws, bc, reserved, reserve } = warehouse();
			const front = application(bc);
			const place = operation(front, "Place", { internal: true });
			front.consumes(reserve, { by: [place] });
			if (hostile) place.raises(reserved);
			return ws;
		},
	},
	{
		rules: ["rejection-raised"],
		name: "a shape an operation both rejects with and raises as an event has somebody who hears the event",
		fires: ["rejection-raised"],
		build: (hostile) => {
			const { ws, context } = world();
			const bc = context("Sales");
			const app = application(bc);
			const refusal = bc.addSchema("Refusal");
			const refused = app.provides("Refused", {
				description: "",
				type: "event",
				schema: refusal,
			});
			operation(app, "Submit", {
				internal: true,
				rejects: [refusal],
			}).raises(refused);
			const apologise = operation(app, "Apologise", { internal: true });
			if (!hostile)
				bc.addPolicy("Apologise on refusal", { description: "" })
					.on(refused)
					.issues(apologise);
			return ws;
		},
	},
	{
		rules: ["event-unraised"],
		name: "an event of a context we model inside is raised by one of its operations",
		fires: ["event-unraised"],
		build: (hostile) => {
			const { ws, context } = world();
			const bc = context("Sales");
			const app = application(bc);
			const noted = app.provides("Noted", { description: "", type: "event" });
			const note = operation(app, "Note", { internal: true });
			if (!hostile) note.raises(noted);
			return ws;
		},
	},
];

runCases("rule cases: events and raising", ["events-and-raising"], eventCases);
