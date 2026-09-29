import { describe, expect, it } from "vitest";
import { RULE_FAMILIES, type RuleFamily } from "./rule-cases.families";
import {
	type BoundedContext,
	type Consumable,
	type DataSchema,
	type Service,
	Workspace,
} from "./workspace";

export type { Consumable };

/**
 * Support for the `rule-cases.<family>.test.ts` files (issue #57, card 138):
 * the building blocks the pairs are written with, and the one harness that
 * runs every pair the same way. See `rule-cases.boundary.test.ts` for the
 * shape a pair takes.
 */

export type Case = {
	/** The rule ids this pair is the trigger and the nearest-valid case for. */
	rules: string[];
	/** What the one difference between the two models is. */
	name: string;
	build: (hostile: boolean) => Workspace;
	/**
	 * Every rule the hostile model trips. The rules under test are always in it;
	 * anything else is a rule that cannot be avoided by the same fixture, and is
	 * named so that the fixture is known to be the smallest.
	 */
	fires: string[];
};

// ---------------------------------------------------------------------------
// Building blocks. Small on purpose: a case reads as the model it describes.
// ---------------------------------------------------------------------------

export function world() {
	const ws = new Workspace("Cases", { description: "", version: "0" });
	const subdomain = ws
		.addDomain("Domain", { description: "" })
		.addSubdomain("Domain.Sub", { type: "core", description: "" });
	/** A context that serves the subdomain, so it is never reported unserved. */
	const context = (
		name: string,
		flags: {
			external?: boolean;
			boundaryOnly?: boolean;
			bigBallOfMud?: boolean;
		} = {},
	) =>
		ws.addBoundedContext(name, {
			description: "",
			subdomains: [subdomain],
			...flags,
		});
	return { ws, context };
}

export const application = (bc: BoundedContext, name = `${bc.name} App`) =>
	bc.addService(name, { description: "", type: "application" });

export const operation = (
	on: Service | ReturnType<BoundedContext["addAggregate"]>,
	name: string,
	extra: {
		internal?: boolean;
		pattern?: "open-host-service";
		rejects?: DataSchema[];
		schema?: DataSchema;
	} = {},
) => on.provides(name, { description: "", type: "operation", ...extra });

/** An aggregate with a root that has an identity, so no other rule minds it. */
export function aggregate(bc: BoundedContext, name: string) {
	const agg = bc.addAggregate(name, { description: "" });
	const root = agg.addRootEntity(name, { description: "" });
	root.addAttribute("Id", { type: "uuid", identity: true });
	return { agg, root };
}

/**
 * Up offers an operation, Down calls it from an operation of its own, and the
 * pair declares the relationship that says so: the model the caller rules are
 * asked about, clean as it stands.
 */
export function call({ declared = true } = {}) {
	const { ws, context } = world();
	const up = context("Up");
	const down = context("Down");
	up.upstreamOf(down, {
		upstreamRoles: declared ? ["open-host-service"] : [],
		downstreamRoles: ["anti-corruption-layer"],
	});
	const upApp = application(up);
	const ping = operation(
		upApp,
		"Ping",
		declared ? { pattern: "open-host-service" } : {},
	);
	const downApp = application(down);
	const act = operation(downApp, "Act", { internal: true });
	downApp.consumes(ping, { pattern: "anti-corruption-layer", by: [act] });
	return { ws, context, up, down, upApp, ping, downApp, act };
}

/**
 * Up publishes a fact, Down reacts to it with a policy that issues an
 * operation of its own and says so in a consumption: the model the
 * subscription rules are asked about, clean as it stands.
 */
export function subscription() {
	const { ws, context } = world();
	const up = context("Up");
	const down = context("Down");
	up.upstreamOf(down, {
		upstreamRoles: ["published-language"],
		downstreamRoles: ["conformist"],
	});
	const upApp = application(up);
	const happened = upApp.provides("Happened", {
		description: "",
		type: "event",
		pattern: "published-language",
	});
	operation(upApp, "Make", { internal: true }).raises(happened);
	const downApp = application(down);
	const record = operation(downApp, "Record", { internal: true });
	const react = down.addPolicy("React", { description: "" });
	react.on(happened).issues(record);
	return { ws, context, up, down, upApp, happened, downApp, record, react };
}

const diagnosticsOf = (ws: Workspace) => ws.validate().map((d) => `${d.rule}`);

/**
 * Runs every pair of a family: the hostile model trips exactly the rules in
 * `fires`, the near-miss validates with no diagnostic at all, and the family's
 * rules are exactly the ones the map says are covered.
 */
export function runCases(title: string, families: RuleFamily[], cases: Case[]) {
	describe(title, () => {
		for (const c of cases) {
			describe(`${c.rules.join(", ")}: ${c.name}`, () => {
				it("trips", () => {
					const fired = diagnosticsOf(c.build(true));
					expect(fired.slice().sort()).toEqual(c.fires.slice().sort());
					for (const rule of c.rules) expect(fired).toContain(rule);
				});
				it("stays clean at the nearest valid model", () => {
					expect(c.build(false).validate()).toEqual([]);
				});
			});
		}

		it("has a pair for every rule the map marks covered in these families", () => {
			const cased = new Set(cases.flatMap((c) => c.rules));
			const claimed = Object.entries(RULE_FAMILIES)
				.filter(
					([, e]) => e.status === "covered" && families.includes(e.family),
				)
				.map(([rule]) => rule)
				.sort();
			expect([...cased].sort()).toEqual(claimed);
		});
	});
}
