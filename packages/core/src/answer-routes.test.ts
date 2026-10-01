import { describe, expect, it } from "vitest";
import { flowEdgeLabel, ODSFlowMap } from "./flow-map";
import { answersInvocation } from "./invocation-walk";
import { ReactionChain, type Reactor, routesTo } from "./reaction-walk";
import {
	type BoundedContext,
	type Consumable,
	type Policy,
	type Process,
	Workspace,
} from "./workspace";

/**
 * Every route an answer comes home by, not the first kind found (issue #108,
 * twentieth signoff review).
 *
 * A reactor may have made one call several ways at once: it issues the
 * answering operation itself, a `by` names an operation it issues, and an
 * operation it issues reaches the call through local fronts. `routesTo`
 * returned the first of those kinds that found anything, so adding a valid
 * direct route erased a valid indirect one, and the reaction walk and the flow
 * map lost the answer step with it. Each case below names what the reactor
 * issues, the calls, and every root the answer must come home to, and asks the
 * same of the walk, the map and the JSON round trip.
 */

type Writes = "all" | "none" | "first";

/**
 * One context of internal operations, each on a service of its own so a silent
 * consumption infers its sole operation as `by` exactly as writing it would.
 * `Query` returns `Fact` and refuses with `Refused`; every other name is a
 * plain operation. `writes` says which calls name their caller: all, none, or
 * only the first listed.
 */
function orders(calls: string[], writes: Writes = "all") {
	const ws = new Workspace("Routes", { description: "", version: "0" });
	const served = ws
		.addDomain("Ordering", { description: "" })
		.addSubdomain("Orders", { description: "", type: "core" });
	const bc = ws.addBoundedContext("Orders", { description: "" }).serves(served);
	const fact = bc.addSchema("Fact");
	fact.addAttribute("ok", { type: "boolean" });
	const refused = bc.addSchema("Refused");
	refused.addAttribute("why", { type: "string" });
	const ops = new Map<string, Consumable>();
	const op = (name: string) => {
		const existing = ops.get(name);
		if (existing) return existing;
		const made = bc
			.addService(`${name} Handler`, { description: "", type: "application" })
			.provides(name, {
				description: "",
				type: "operation",
				internal: true,
				...(name === "Query" && { returns: fact, rejects: [refused] }),
			});
		ops.set(name, made);
		return made;
	};
	calls.forEach((call, at) => {
		const [from, to] = call.split(" -> ").map(op);
		const named = writes === "all" || (writes === "first" && at === 0);
		from!.provider.consumes(to!, named ? { by: [from!] } : {});
	});
	return { ws, bc, op, query: op("Query"), refused };
}

/** A process that starts on `start`, issues `issues` and waits on Query. */
function waiting(
	built: ReturnType<typeof orders>,
	name: string,
	issues: string[],
	start = `${name} Start`,
) {
	const { bc, op, query, refused } = built;
	return bc
		.addProcess(name, { description: "" })
		.starts(op(start))
		.on(query.rejected(refused))
		.issues(...issues.map(op))
		.ends(query.returned());
}

const names = (steps: Reactor[]) => steps.map((it) => it.name);

const diagnostics = (ws: Workspace) =>
	ws.validate().map((d) => [d.rule, d.ref.split("/").pop()]);

const roundTripped = (ws: Workspace) =>
	Workspace.fromSchema(JSON.parse(JSON.stringify(ws.toSchema())));

/** The roots the walk draws a waited-on answer step from, into `reactor`. */
function answerSteps(ws: Workspace, reactor: Reactor): string[] {
	const chain = new ReactionChain(ws.boundedcontexts.values());
	return chain.steps.flatMap((node) =>
		chain
			.stepsFrom(node)
			.filter((step) => step.to === reactor && step.answer)
			.map(() => node.name),
	);
}

/** The flow map's answer edges into the reactor, as a reader reads them. */
function answerEdges(ws: Workspace, reactor: Reactor): string[] {
	return Array.from(ODSFlowMap.fromWorkspace(ws).edges.values())
		.filter((edge) => edge.target.id === reactor.ref && edge.answer)
		.map((edge) => `${edge.source.name} [${flowEdgeLabel(edge)}]`)
		.sort();
}

/** What a reader of the walk and the map must see for these roots. */
function expectRoutes(
	ws: Workspace,
	reactor: Policy | Process,
	query: Consumable,
	roots: string[],
) {
	expect(names(routesTo(reactor, query))).toEqual(roots);
	expect(answerSteps(ws, reactor).sort()).toEqual([...roots].sort());
	expect(answerEdges(ws, reactor)).toEqual(
		roots
			.flatMap((root) => [`${root} [Fact (ends)]`, `${root} [Refused]`])
			.sort(),
	);
}

/** The same, read back from the workspace's JSON. */
function expectRoutesAfterRoundTrip(
	ws: Workspace,
	reactor: Policy | Process,
	query: Consumable,
	roots: string[],
) {
	const back = roundTripped(ws);
	expect(diagnostics(back)).toEqual(diagnostics(ws));
	expectRoutes(
		back,
		back.getByRef(reactor.ref) as Process,
		back.getByRef(query.ref) as Consumable,
		roots,
	);
}

/**
 * The route matrix: what `Run` issues, the calls, and the roots its answer
 * comes home to, in the order the process declares them. `starts` replaces
 * the default starting command, which makes no call.
 */
const matrix: Array<{
	name: string;
	issues: string[];
	calls: string[];
	roots: string[];
	starts?: string;
	/** What else the model is told, where the shape says more than routes. */
	findings?: string[][];
}> = [
	{
		name: "no root",
		issues: ["Other"],
		calls: ["Elsewhere -> Query"],
		roots: [],
	},
	{
		name: "one direct root",
		issues: ["Direct"],
		calls: ["Direct -> Query"],
		roots: ["Direct"],
	},
	{
		name: "one indirect root",
		issues: ["Indirect"],
		calls: ["Indirect -> Middle", "Middle -> Query"],
		roots: ["Indirect"],
	},
	{
		name: "a direct and an indirect root",
		issues: ["Direct", "Indirect"],
		calls: ["Direct -> Query", "Indirect -> Middle", "Middle -> Query"],
		roots: ["Direct", "Indirect"],
	},
	{
		name: "the answering operation issued itself beside an indirect root",
		issues: ["Query", "Indirect"],
		calls: ["Indirect -> Middle", "Middle -> Query"],
		roots: ["Query", "Indirect"],
	},
	{
		name: "two indirect roots of different lengths",
		issues: ["Short", "Long"],
		calls: [
			"Short -> Hop",
			"Hop -> Query",
			"Long -> First",
			"First -> Second",
			"Second -> Query",
		],
		roots: ["Short", "Long"],
	},
	{
		name: "every kind at once, in declaration order",
		issues: ["Indirect", "Query", "Direct"],
		calls: ["Direct -> Query", "Indirect -> Middle", "Middle -> Query"],
		roots: ["Indirect", "Query", "Direct"],
	},
	{
		name: "the starting command's call beside an indirect root",
		issues: ["Indirect"],
		starts: "Begin",
		calls: ["Begin -> Query", "Indirect -> Middle", "Middle -> Query"],
		roots: ["Begin", "Indirect"],
	},
	{
		name: "an issued root nested inside another issued root",
		issues: ["Outer", "Inner"],
		calls: ["Inner -> Query", "Outer -> Inner"],
		roots: ["Outer", "Inner"],
	},
	{
		name: "one root reaching the call along several paths",
		issues: ["Hub"],
		calls: [
			"Hub -> Query",
			"Hub -> Left",
			"Left -> Query",
			"Hub -> Right",
			"Right -> Query",
		],
		roots: ["Hub"],
	},
	{
		name: "a ring of local calls on the way to a direct root",
		issues: ["Direct", "Loop"],
		calls: ["Direct -> Query", "Loop -> Ring", "Ring -> Loop", "Ring -> Query"],
		roots: ["Direct", "Loop"],
		// A ring of calls is reported for what it is; the routes still
		// terminate and stay the same.
		findings: [["reaction-cycle", "loop"]],
	},
];

describe("routesTo combines every route an answer comes home by", () => {
	for (const { name, issues, calls, roots, starts, findings = [] } of matrix)
		for (const writes of ["all", "none", "first"] as const)
			it(`${name}, with by written on ${writes === "first" ? "the first call only" : `${writes} calls`}`, () => {
				const built = orders(calls, writes);
				const run = waiting(built, "Run", issues, starts);
				const unheard = [
					["consumable-kind", "run"],
					["consumable-kind", "run"],
				];
				expect(diagnostics(built.ws)).toEqual(
					roots.length > 0 ? findings : unheard,
				);
				expectRoutes(built.ws, run, built.query, roots);
				expectRoutesAfterRoundTrip(built.ws, run, built.query, roots);
			});

	// The reviewer's exact model: every operation on one application service,
	// so only a written `by` can say who calls.
	it("routes the reviewer's single-service model both ways", () => {
		const ws = new Workspace("Routes", { description: "", version: "0" });
		const served = ws
			.addDomain("Ordering", { description: "" })
			.addSubdomain("Orders", { description: "", type: "core" });
		const bc = ws
			.addBoundedContext("Orders", { description: "" })
			.serves(served);
		const fact = bc.addSchema("Fact");
		fact.addAttribute("ok", { type: "boolean" });
		const app = bc.addService("Orders App", {
			description: "",
			type: "application",
		});
		const provide = (name: string) =>
			app.provides(name, {
				description: "",
				type: "operation",
				internal: true,
				...(name === "Query" && { returns: fact }),
			});
		const [start, direct, indirect, middle, query] = [
			"Start",
			"Direct",
			"Indirect",
			"Middle",
			"Query",
		].map(provide);
		app.consumes(query!, { by: [direct!, middle!] });
		app.consumes(middle!, { by: [indirect!] });
		const run = bc
			.addProcess("Run", { description: "" })
			.starts(start!)
			.issues(direct!, indirect!)
			.ends(query!.returned());
		expect(ws.validate()).toEqual([]);
		expect(names(routesTo(run, query!))).toEqual(["Direct", "Indirect"]);
		const back = roundTripped(ws);
		expect(back.validate()).toEqual([]);
		expect(
			names(
				routesTo(
					back.getByRef(run.ref) as Process,
					back.getByRef(query!.ref) as Consumable,
				),
			),
		).toEqual(["Direct", "Indirect"]);
		expect(
			Array.from(ODSFlowMap.fromWorkspace(back).edges.values())
				.filter((edge) => edge.target.id === run.ref && edge.answer)
				.map((edge) => `${edge.source.name} [${flowEdgeLabel(edge)}]`),
		).toEqual(["Direct [Fact (ends)]", "Indirect [Fact (ends)]"]);
	});
});

/**
 * The union adds no reach: each reactor hears only the calls its own admitted
 * roots make, conditional on its own invocation (decisions 21 and 23). A
 * shared front is each issuer's own root; nobody borrows another reactor's
 * call, its nested root, or a call it never issued.
 */
describe("routesTo keeps every route the reactor's own", () => {
	const writing = ["all", "none", "first"] as const;
	const said = (writes: Writes) =>
		writes === "first" ? "the first call only" : `${writes} calls`;

	/** Each reactor's roots, asserted on the model and its JSON alike. */
	function expectEach(
		built: ReturnType<typeof orders>,
		roots: Array<[Process, string[]]>,
	) {
		for (const ws of [built.ws, roundTripped(built.ws)]) {
			const query = ws.getByRef(built.query.ref) as Consumable;
			for (const [reactor, expected] of roots)
				expectRoutes(ws, ws.getByRef(reactor.ref) as Process, query, expected);
		}
	}

	for (const writes of writing)
		it(`gives a shared front to each issuer and lends no other root, with by written on ${said(writes)}`, () => {
			const built = orders(
				[
					"Front -> Query",
					"Direct -> Query",
					"Indirect -> Middle",
					"Middle -> Query",
					"Other -> Query",
				],
				writes,
			);
			const first = waiting(built, "First", ["Direct", "Indirect", "Front"]);
			const second = waiting(built, "Second", ["Front", "Other"]);
			const bystander = waiting(built, "Bystander", ["Unrelated"]);
			expect(diagnostics(built.ws)).toEqual([
				["consumable-kind", "bystander"],
				["consumable-kind", "bystander"],
			]);
			expectEach(built, [
				[first, ["Direct", "Indirect", "Front"]],
				[second, ["Front", "Other"]],
				[bystander, []],
			]);
		});

	// One reactor's root is a hop of another's chain: each keeps its own,
	// and neither is lent the other's.
	for (const writes of writing)
		it(`keeps a root nested in another reactor's chain apart, with by written on ${said(writes)}`, () => {
			const built = orders(
				["Middle -> Query", "Indirect -> Middle", "Direct -> Query"],
				writes,
			);
			const first = waiting(built, "First", ["Indirect", "Direct"]);
			const second = waiting(built, "Second", ["Middle"]);
			expect(diagnostics(built.ws)).toEqual([]);
			expectEach(built, [
				[first, ["Indirect", "Direct"]],
				[second, ["Middle"]],
			]);
		});

	// A root of one reactor that is a hop of another's chain is a conditional
	// edge of the map, not a call the other reactor made: the walk keeps
	// both answer steps, and no ring is composed from them (decision 23).
	const sharedAndNested: Array<{
		name: string;
		calls: string[];
		first: string[];
		second: string[];
	}> = [
		{
			name: "a root nested one call into another reactor's chain",
			calls: ["Indirect -> Middle", "Middle -> Query", "Front -> Query"],
			first: ["Indirect", "Front"],
			second: ["Middle", "Front"],
		},
		{
			name: "a root nested behind one more front",
			calls: [
				"Indirect -> Outer",
				"Outer -> Middle",
				"Middle -> Query",
				"Front -> Query",
			],
			first: ["Indirect", "Front"],
			second: ["Middle", "Front"],
		},
		{
			name: "a root nested behind two more fronts",
			calls: [
				"Indirect -> Outer",
				"Outer -> Inner",
				"Inner -> Middle",
				"Middle -> Query",
				"Front -> Query",
			],
			first: ["Indirect", "Front"],
			second: ["Middle", "Front"],
		},
		{
			name: "each reactor's own front to one query",
			calls: ["Mine -> Query", "Yours -> Query"],
			first: ["Mine"],
			second: ["Yours"],
		},
		{
			name: "one front both reactors issue",
			calls: ["Front -> Query"],
			first: ["Front"],
			second: ["Front"],
		},
	];
	for (const { name, calls, first, second } of sharedAndNested)
		for (const writes of writing)
			it(`composes no ring from ${name}, with by written on ${said(writes)}`, () => {
				const built = orders(calls, writes);
				const one = waiting(built, "First", first);
				const two = waiting(built, "Second", second);
				expect(diagnostics(built.ws)).toEqual([]);
				expect(diagnostics(roundTripped(built.ws))).toEqual([]);
				expectEach(built, [
					[one, first],
					[two, second],
				]);
			});

	it("routes a policy's then the same way, its own ring reported as before", () => {
		const built = orders([
			"Direct -> Query",
			"Indirect -> Middle",
			"Middle -> Query",
		]);
		const { bc, op, query, refused } = built;
		const open = op("Open");
		const opened = open.provider.provides("Opened", {
			description: "",
			type: "event",
			internal: true,
		});
		open.raises(opened);
		const policy = bc
			.addPolicy("Retry", { description: "" })
			.on(opened, query.rejected(refused))
			.issues(op("Direct"), op("Indirect"));
		expect(names(routesTo(policy, query))).toEqual(["Direct", "Indirect"]);
		expect(answerSteps(built.ws, policy).sort()).toEqual([
			"Direct",
			"Indirect",
		]);
		// A policy that issues the call it waits on closes a ring of its own;
		// that warning stands and is about the policy, not the routes.
		expect(
			diagnostics(built.ws).filter(([rule]) => rule !== "reaction-cycle"),
		).toEqual([]);
	});

	it("routes the calls a starting command makes but never its own answer", () => {
		const built = orders([
			"Begin -> Query",
			"Indirect -> Middle",
			"Middle -> Query",
		]);
		const run = waiting(built, "Run", ["Indirect"], "Begin");
		const begin = built.op("Begin");
		expect(names(routesTo(run, built.query))).toEqual(["Begin", "Indirect"]);
		expect(routesTo(run, begin)).toEqual([]);
		run.on(begin.completed());
		expect(diagnostics(built.ws)).toEqual([["consumable-kind", "run"]]);
	});

	it("crosses one boundary after any local fronts and no second one", () => {
		const ws = new Workspace("Routes", { description: "", version: "0" });
		const served = ws
			.addDomain("Ordering", { description: "" })
			.addSubdomain("Orders", { description: "", type: "core" });
		const provider = ws
			.addBoundedContext("Provider", { description: "" })
			.serves(served);
		const caller = ws
			.addBoundedContext("Orders", { description: "" })
			.serves(served);
		provider.upstreamOf(caller, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const fact = provider.addSchema("Fact");
		fact.addAttribute("ok", { type: "boolean" });
		const api = provider.addService("Provider API", {
			description: "",
			type: "application",
		});
		const query = api.provides("Query", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
			returns: fact,
		});
		const deep = provider
			.addService("Provider Store", { description: "", type: "application" })
			.provides("Deep", { description: "", type: "operation", internal: true });
		api.consumes(deep, { by: [query] });
		const local = (bc: BoundedContext, name: string) =>
			bc
				.addService(`${name} Handler`, { description: "", type: "application" })
				.provides(name, { description: "", type: "operation", internal: true });
		const [start, direct, indirect, middle] = [
			"Start",
			"Direct",
			"Indirect",
			"Middle",
		].map((name) => local(caller, name));
		direct!.provider.consumes(query, { pattern: "anti-corruption-layer" });
		middle!.provider.consumes(query, { pattern: "anti-corruption-layer" });
		indirect!.provider.consumes(middle!);
		const run = caller
			.addProcess("Run", { description: "" })
			.starts(start!)
			.issues(direct!, indirect!)
			.ends(query.returned());
		expect(ws.validate()).toEqual([]);
		expect(names(routesTo(run, query))).toEqual(["Direct", "Indirect"]);
		// What Provider does with the call is Provider's own chain.
		expect(routesTo(run, deep)).toEqual([]);
	});

	it("keeps the invalid self-named caller beside the real routes", () => {
		const built = orders(["Indirect -> Middle", "Middle -> Query"]);
		const run = waiting(built, "Run", ["Indirect"]);
		built.bc
			.addService("Self Handler", { description: "", type: "application" })
			.consumes(built.query, { by: [run] });
		expect(names(routesTo(run, built.query))).toEqual(["Indirect", "Run"]);
		expect(answerSteps(built.ws, run).sort()).toEqual(["Indirect", "Run"]);
		expect(diagnostics(built.ws).map(([rule]) => rule)).toContain(
			"consumption-by-operation",
		);
	});

	it("draws no route from an ambiguous silent caller beside a real one", () => {
		const built = orders(["Indirect -> Middle", "Middle -> Query"]);
		const run = waiting(built, "Run", ["Indirect", "Ambiguous"]);
		const ambiguous = built.op("Ambiguous");
		ambiguous.provider.provides("Spare", {
			description: "",
			type: "operation",
			internal: true,
		});
		ambiguous.provider.consumes(built.query);
		expect(names(routesTo(run, built.query))).toEqual(["Indirect"]);
		expect(diagnostics(built.ws).map(([rule]) => rule)).toEqual([
			"consumption-by-required",
		]);
	});

	it("terminates on a ring of calls that never reaches the call", () => {
		const built = orders([
			"Spin -> Ring",
			"Ring -> Spin",
			"Elsewhere -> Query",
		]);
		const run = waiting(built, "Run", ["Spin"]);
		expect(routesTo(run, built.query)).toEqual([]);
	});

	// The answer steps are the only edges the union adds: the calls out and
	// the facts they raise are drawn exactly as before.
	it("leaves the calls and events of the walk unchanged", () => {
		const built = orders([
			"Direct -> Query",
			"Indirect -> Middle",
			"Middle -> Query",
		]);
		const answered = built.query.provider.provides("Answered", {
			description: "",
			type: "event",
			internal: true,
		});
		built.query.raises(answered);
		waiting(built, "Run", ["Direct", "Indirect"]);
		expect(
			Array.from(ODSFlowMap.fromWorkspace(built.ws).edges.values()).map(
				(edge) =>
					`${edge.source.name} -> ${edge.target.name}${flowEdgeLabel(edge) ? ` [${flowEdgeLabel(edge)}]` : ""}`,
			),
		).toEqual([
			"Run Start -> Run",
			"Run -> Direct",
			"Direct -> Query",
			"Query -> Answered",
			"Direct -> Run [Refused]",
			"Run -> Indirect",
			"Indirect -> Middle",
			"Middle -> Query",
			"Indirect -> Run [Refused]",
			"Direct -> Run [Fact (ends)]",
			"Indirect -> Run [Fact (ends)]",
		]);
	});
});

/**
 * A ring is a ring of one invocation's steps (issue #108, twentieth review).
 * The walk draws an answer step from the call it came back down, conditional
 * on the reactor that made that call; `reaction-cycle` reads the same steps
 * and so composes a ring only from steps one invocation actually takes. A
 * reactor's root that is a hop of another reactor's chain no longer closes a
 * ring through both, while every ring the reactors really run still warns.
 */
describe("reaction-cycle follows each call's own invocation", () => {
	/** An event `name` that operation `of` raises, on the same handler. */
	function raising(built: ReturnType<typeof orders>, of: string, name: string) {
		const operation = built.op(of);
		const event = operation.provider.provides(name, {
			description: "",
			type: "event",
			internal: true,
		});
		operation.raises(event);
		return event;
	}

	const cycles = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "reaction-cycle")
			.map((d) => [d.message, d.ref.split("/").pop()]);

	const loop = (...steps: string[]) =>
		`Reactions run in a cycle: ${steps.map((it) => `"${it}"`).join(" -> ")}; the chain triggers itself and nothing in the model says what ends it`;

	// Two processes that really wake each other: each one's operation raises
	// the fact the other waits on.
	it("warns about two processes each waking the other through events", () => {
		const built = orders([]);
		const asked = raising(built, "Ask", "Asked");
		const told = raising(built, "Tell", "Told");
		built.bc
			.addProcess("First", { description: "" })
			.starts(built.op("First Start"))
			.on(told)
			.issues(built.op("Ask"))
			.ends(built.query.returned());
		built.bc
			.addProcess("Second", { description: "" })
			.starts(built.op("Second Start"))
			.on(asked)
			.issues(built.op("Tell"))
			.ends(built.query.returned());
		const expected = [
			[
				loop("First", "Ask", "Asked", "Second", "Tell", "Told", "First"),
				"first",
			],
		];
		expect(cycles(built.ws)).toEqual(expected);
		expect(cycles(roundTripped(built.ws))).toEqual(expected);
	});

	// The phantom shares its steps with a real ring: the real one is still
	// found, and only it, whichever the walk meets first.
	for (const writes of ["all", "none", "first"] as const)
		it(`finds the real ring beside a phantom one, with by written on ${writes === "first" ? "the first call only" : `${writes} calls`}`, () => {
			const built = orders(
				["Indirect -> Middle", "Middle -> Query", "Front -> Query"],
				writes,
			);
			const signalled = raising(built, "Signal", "Signalled");
			const moved = raising(built, "Middle", "Moved");
			built.bc
				.addProcess("First", { description: "" })
				.starts(built.op("First Start"))
				.on(built.query.rejected(built.refused), moved)
				.issues(built.op("Indirect"), built.op("Front"), built.op("Signal"))
				.ends(built.query.returned());
			built.bc
				.addProcess("Second", { description: "" })
				.starts(built.op("Second Start"))
				.on(built.query.rejected(built.refused), signalled)
				.issues(built.op("Middle"), built.op("Front"))
				.ends(built.query.returned());
			const expected = [
				[
					loop(
						"First",
						"Signal",
						"Signalled",
						"Second",
						"Middle",
						"Moved",
						"First",
					),
					"first",
				],
			];
			expect(cycles(built.ws)).toEqual(expected);
			expect(cycles(roundTripped(built.ws))).toEqual(expected);
		});

	// A policy that waits on its own call's answer retries: that ring is
	// real and its own. The process beside it lends it nothing.
	it("warns about a policy's own retry and no ring through the process beside it", () => {
		const built = orders([
			"Indirect -> Middle",
			"Middle -> Query",
			"Front -> Query",
		]);
		const opened = raising(built, "Open", "Opened");
		waiting(built, "First", ["Indirect", "Front"]);
		const retry = built.bc
			.addPolicy("Retry", { description: "" })
			.on(opened, built.query.rejected(built.refused))
			.issues(built.op("Middle"), built.op("Front"));
		expect(names(routesTo(retry, built.query))).toEqual(["Middle", "Front"]);
		const expected = [
			[loop("Retry", "Middle", "Retry"), "retry"],
			[loop("Retry", "Front", "Retry"), "retry"],
		];
		expect(cycles(built.ws)).toEqual(expected);
		expect(cycles(roundTripped(built.ws))).toEqual(expected);
	});

	// The operation that starts a process is the instance's first step, so
	// the calls it makes answer that instance whoever issued it; its own
	// answer goes to whoever called it, and a bystander hears neither.
	it("lets a started process hear its start's calls, never the start's own answer", () => {
		const built = orders(["Begin -> Query"]);
		const begin = built.op("Begin");
		const issuer = waiting(built, "Issuer", ["Begin"]);
		const started = waiting(built, "Started", [], "Begin");
		started.on(begin.completed());
		const bystander = waiting(built, "Bystander", ["Other"]);
		// Starting on and issuing the same operation makes its own answer this
		// process's on its own call only, not on the issuer's.
		const both = waiting(built, "Both", ["Begin"], "Begin");
		both.on(begin.completed());
		const taken = (caller: Process) =>
			new ReactionChain(built.ws.boundedcontexts.values())
				.stepsFrom(begin)
				.filter((step) => step.answer)
				.filter((step) => answersInvocation(caller, begin, step))
				.map((step) => `${step.to.name}: ${step.answer?.origin}`);
		expect(taken(issuer)).toEqual([
			"Issuer: Query rejects with Refused",
			"Started: Query rejects with Refused",
			"Both: Query rejects with Refused",
		]);
		expect(taken(bystander)).toEqual([
			"Started: Query rejects with Refused",
			"Both: Query rejects with Refused",
		]);
		expect(taken(both)).toContain("Both: Begin completes");
		expect(routesTo(started, begin)).toEqual([]);
	});

	it("warns about a policy retrying through a front, and nothing else", () => {
		const built = orders(["Direct -> Query"]);
		const opened = raising(built, "Open", "Opened");
		built.bc
			.addPolicy("Retry", { description: "" })
			.on(opened, built.query.rejected(built.refused))
			.issues(built.op("Direct"));
		expect(diagnostics(built.ws)).toEqual([["reaction-cycle", "retry"]]);
		expect(cycles(built.ws)).toEqual([
			[loop("Retry", "Direct", "Retry"), "retry"],
		]);
	});
});
