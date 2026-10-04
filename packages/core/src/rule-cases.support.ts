import { afterAll, describe, expect, it } from "vitest";
import { RULE_FAMILIES, type RuleFamily } from "./rule-cases.families";
import {
	type BoundedContext,
	type Consumable,
	type DataSchema,
	type Service,
	Workspace,
} from "./workspace";
import { WorkspaceSet } from "./workspace-set";

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

/**
 * While a case is being built across two files (see {@link buildAcrossFiles}),
 * the workspaces `world()` made and which one the next context goes to. Absent
 * otherwise, and then `world()` is one workspace holding every context, as
 * every case was written.
 */
let across: { workspaces: Workspace[] } | undefined;

export function world({ commentsRequired = false } = {}) {
	const make = (name: string) => {
		const ws = new Workspace(name, {
			description: "",
			version: "0",
			...(commentsRequired ? { options: { rules: { commentsRequired } } } : {}),
		});
		const subdomain = ws
			.addDomain("Domain", { description: "" })
			.addSubdomain("Domain.Sub", { type: "core", description: "" });
		return { ws, subdomain };
	};
	const first = make("Cases");
	// Across two files the second file is made the first time a second context
	// wants one, and contexts then take the files in turn.
	const files = [first];
	if (across) across.workspaces.push(first.ws);
	let made = 0;
	/** A context that serves the subdomain, so it is never reported unserved. */
	const context = (
		name: string,
		flags: {
			external?: boolean;
			boundaryOnly?: boolean;
			bigBallOfMud?: boolean;
			/** False leaves the context serving no subdomain. */
			serves?: boolean;
		} = {},
	) => {
		const { serves = true, ...rest } = flags;
		if (across && made % 2 === 1 && files.length === 1) {
			files.push(make(`${first.ws.name} B`));
			across.workspaces.push(files[1].ws);
		}
		const home = across ? files[made % 2] : first;
		made++;
		return home.ws.addBoundedContext(name, {
			description: "",
			subdomains: serves ? [home.subdomain] : [],
			...rest,
		});
	};
	return { ws: first.ws, context };
}

/**
 * Builds a case with its contexts shared out over two files in turn, the first
 * context in the first file, the second in the second, and so on, and joins
 * them into one set. Nothing else about the case changes: the same builder
 * runs, the same rules are asked, and what is declared across the two files is
 * what the case declared across two contexts.
 */
export function buildAcrossFiles(
	build: (hostile: boolean) => Workspace,
	hostile: boolean,
): WorkspaceSet {
	const session = { workspaces: [] as Workspace[] };
	across = session;
	let built: Workspace;
	try {
		built = build(hostile);
	} finally {
		across = undefined;
	}
	// A case that loads its model from a file never shared contexts out, and is
	// the one file of its set.
	const files = session.workspaces.includes(built)
		? session.workspaces
		: [built];
	if (files.length > 1) GENERATED_EXECUTIONS["over more than one file"]++;
	return WorkspaceSet.fromWorkspaces(
		files.map((workspace, i) => [`case-${i}.json`, workspace]),
	);
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
		returns?: DataSchema;
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

/** A diagnostic without its ref, which a file qualifies differently from one file. */
const reading = ({
	rule,
	severity,
	message,
}: {
	rule: string;
	severity: string;
	message: string;
}) => JSON.stringify([rule, severity, message]);

/**
 * How many generated set executions ran, by kind, so a report can say what
 * ran and not what was assumed. Counted as each one runs.
 */
export const GENERATED_EXECUTIONS = {
	"set of one": 0,
	"across two files": 0,
	/** Of those, the ones whose set really held more than one file. */
	"over more than one file": 0,
};

/**
 * Runs every pair of a family: the hostile model trips exactly the rules in
 * `fires`, the near-miss validates with no diagnostic at all, and the family's
 * rules are exactly the ones the map says are covered.
 */
export function runCases(title: string, families: RuleFamily[], cases: Case[]) {
	describe(title, () => {
		// Asked for by a report of what ran, so it can say what ran rather than
		// what was assumed; silent otherwise.
		afterAll(() => {
			if (process.env.ODS_REPORT_GENERATED)
				console.log(
					`[generated] ${title}: cases=${cases.length} ${JSON.stringify(GENERATED_EXECUTIONS)}`,
				);
		});
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
				// The same pair, asked of a set. As the only file of one, every
				// diagnostic comes back in the order the workspace gives it, each
				// attributed to the file; across two files, the same rules fire
				// with the same words, for the contexts kept apart by file.
				for (const hostile of [true, false]) {
					const model = hostile ? "hostile model" : "nearest valid model";
					it(`gives a set of one file the answer it gives alone: ${model}`, () => {
						GENERATED_EXECUTIONS["set of one"]++;
						const alone = c.build(hostile).validate();
						const set = WorkspaceSet.fromWorkspaces([
							["case.json", c.build(hostile)],
						]);
						const answered = set.validate();
						expect(answered.every((d) => d.file === "case.json")).toBe(true);
						expect(
							answered.map(({ file: _file, ...diagnostic }) => diagnostic),
						).toEqual(alone);
					});
					it(`gives the same answer across two files: ${model}`, () => {
						GENERATED_EXECUTIONS["across two files"]++;
						const alone = c.build(hostile).validate();
						const answered = buildAcrossFiles(c.build, hostile).validate();
						expect(answered.map(reading).sort()).toEqual(
							alone.map(reading).sort(),
						);
					});
				}
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
			// A family file may also hold a pair for a rule of another family it
			// meets on the way; what it may not do is leave one of its own without.
			expect([...cased].filter((r) => claimed.includes(r)).sort()).toEqual(
				claimed,
			);
		});
	});
}
