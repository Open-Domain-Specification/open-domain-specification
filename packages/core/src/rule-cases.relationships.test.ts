import {
	application,
	type Case,
	call,
	operation,
	runCases,
	world,
} from "./rule-cases.support";

/**
 * Slice 2 of issue #57: the relationship and role rules. Each pair is one
 * builder taking `hostile`; see `rule-cases.boundary.test.ts` for the shape.
 */

/**
 * Two contexts and a call from Down to Up's `Ping`, with the relationship
 * roles the caller says. `from` is the caller.
 */
function ring(secondTranslated: boolean) {
	const { ws, context } = world();
	const x = context("X");
	const y = context("Y");
	/** `to` offers `name`; `caller` calls it from an operation of its own. */
	const calls = (
		to: typeof x,
		caller: typeof x,
		name: string,
		translated: boolean,
	) => {
		to.upstreamOf(caller, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: [translated ? "anti-corruption-layer" : "conformist"],
		});
		const offered = operation(application(to, `${to.name} Offer`), name, {
			pattern: "open-host-service",
		});
		const app = application(caller, `${caller.name} Caller`);
		const act = operation(app, `Act on ${name}`, { internal: true });
		app.consumes(offered, {
			pattern: translated ? "anti-corruption-layer" : "conformist",
			by: [act],
		});
	};
	calls(x, y, "X Ping", false);
	calls(y, x, "Y Ping", secondTranslated);
	return ws;
}

const relationshipCases: Case[] = [
	{
		rules: ["relationship-roles-backed"],
		name: "an upstream role is declared only where something offered carries it",
		fires: ["relationship-roles-backed"],
		build: (hostile) => {
			const { ws, up, down } = call();
			// call() declares open-host-service, which Ping backs; the hostile
			// model also claims published-language, which nothing carries.
			ws.relationships.length = 0;
			up.upstreamOf(down, {
				upstreamRoles: hostile
					? ["open-host-service", "published-language"]
					: ["open-host-service"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			return ws;
		},
	},
	{
		rules: ["consumption-agreement"],
		name: "a consumption across a pair with two agreements in one direction says which it belongs to",
		// Belonging to neither agreement, the exchange backs neither one's roles.
		fires: [
			"consumption-agreement",
			"relationship-roles-backed",
			"relationship-roles-backed",
		],
		build: (hostile) => {
			const { ws, up, down, ping, downApp, act } = call();
			ws.relationships.length = 0;
			const negotiated = up.upstreamOf(down, {
				name: "negotiated",
				upstreamRoles: ["open-host-service"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			up.upstreamOf(down, { name: "tolerated" });
			downApp.consumptions.length = 0;
			downApp.consumes(ping, {
				pattern: "anti-corruption-layer",
				by: [act],
				...(hostile ? {} : { relationship: negotiated }),
			});
			return ws;
		},
	},
	{
		rules: ["consumption-agreement"],
		name: "the agreement a consumption names joins the two contexts it crosses",
		fires: [
			"consumption-agreement",
			"relationship-roles-backed",
			"relationship-roles-backed",
		],
		build: (hostile) => {
			const { ws, context, down, ping, downApp, act } = call();
			const other = context("Other");
			const elsewhere = other.upstreamOf(down);
			const here = ws.relationships[0];
			downApp.consumptions.length = 0;
			downApp.consumes(ping, {
				pattern: "anti-corruption-layer",
				by: [act],
				relationship: hostile ? elsewhere : here,
			});
			return ws;
		},
	},
	{
		rules: ["relationship-declared"],
		name: "two contexts joined by a crossing declare a relationship",
		fires: ["relationship-declared"],
		build: (hostile) => {
			const { ws } = call();
			if (hostile) ws.relationships.length = 0;
			return ws;
		},
	},
	{
		rules: ["relationship-duplicate"],
		name: "a pair declares one unnamed directed relationship per direction; a second is named",
		fires: ["relationship-duplicate"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			up.upstreamOf(down, hostile ? {} : { name: "negotiated" });
			up.upstreamOf(down, hostile ? {} : { name: "tolerated" });
			return ws;
		},
	},
	{
		rules: ["relationship-cycle"],
		name: "two contexts calling each other on untranslated terms ring; a call behind an anti-corruption layer does not count",
		fires: ["relationship-cycle"],
		build: (hostile) => ring(!hostile),
	},
	{
		rules: ["partnership-backed"],
		name: "partners exchange something in at least one direction",
		fires: ["partnership-backed"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			up.partnerOf(down);
			const ping = operation(application(up), "Ping");
			const downApp = application(down);
			const act = operation(downApp, "Act", { internal: true });
			if (!hostile) downApp.consumes(ping, { by: [act] });
			return ws;
		},
	},
	{
		rules: ["shared-kernel-backed"],
		name: "a shared kernel has something in it: a value object held, a schema carried or an operation called",
		fires: ["shared-kernel-backed"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			up.sharesKernelWith(down);
			const ping = operation(application(up), "Ping");
			const downApp = application(down);
			const act = operation(downApp, "Act", { internal: true });
			if (!hostile) downApp.consumes(ping, { by: [act] });
			return ws;
		},
	},
	{
		rules: ["conformist-backed"],
		name: "a declared conformist takes something of its upstream's",
		// Taking nothing also leaves the conformist role with no consumption to
		// declare it, which is the same absence read from the other side.
		fires: ["conformist-backed", "relationship-roles-backed"],
		build: (hostile) => {
			const { ws, context } = world();
			const up = context("Up");
			const down = context("Down");
			up.upstreamOf(down, {
				upstreamRoles: hostile ? [] : ["open-host-service"],
				downstreamRoles: ["conformist"],
			});
			const ping = operation(application(up), "Ping", {
				pattern: "open-host-service",
			});
			const downApp = application(down);
			const act = operation(downApp, "Act", { internal: true });
			if (!hostile)
				downApp.consumes(ping, { pattern: "conformist", by: [act] });
			return ws;
		},
	},
	{
		rules: ["mud-needs-acl"],
		name: "a consumption out of a big ball of mud is translated behind an anti-corruption layer",
		fires: ["mud-needs-acl"],
		build: (hostile) => {
			const { ws, context } = world();
			const mud = context("Legacy", { bigBallOfMud: true });
			const down = context("Down");
			const role = hostile ? "conformist" : "anti-corruption-layer";
			mud.upstreamOf(down, {
				upstreamRoles: ["open-host-service"],
				downstreamRoles: [role],
			});
			const ping = operation(application(mud), "Ping", {
				pattern: "open-host-service",
			});
			const downApp = application(down);
			const act = operation(downApp, "Act", { internal: true });
			downApp.consumes(ping, { pattern: role, by: [act] });
			return ws;
		},
	},
];

runCases(
	"rule cases: relationships and roles",
	["relationships-and-roles"],
	relationshipCases,
);
