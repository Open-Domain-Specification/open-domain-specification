import { describe, expect, it } from "vitest";
import type { Consumable, Process } from "./workspace";
import { Workspace } from "./workspace";

/**
 * A benign ring never hides a genuine one (issue #108, local audit before the
 * twenty-first review).
 *
 * `reaction-cycle` met rings one back edge at a time and never walked a node
 * twice, so where a process's own lifecycle and a real feedback loop shared a
 * node, the walk could take the lifecycle's back edge, exempt it, and never
 * see the loop. Each case here is one shape with a lifecycle or another
 * exemption beside a ring that must warn, built in every order its
 * operations, events, reactors, listeners and commands can be declared,
 * because declaration order is what chose which back edge the walk took.
 */

type ReactorSpec = {
	name: string;
	kind?: "process" | "policy";
	/** The operation a process starts on; `<name> Start` by default. */
	starts?: string;
	on: string[];
	issues: string[];
	/**
	 * What ends a process: an event, or the operation whose completion does;
	 * its first command's completion by default.
	 */
	ends?: string;
};

type Spec = {
	operations: string[];
	/** Each event and the operation that raises it. */
	events: Array<[string, string]>;
	/** Calls made on the one service: caller, then the operation it calls. */
	calls?: Array<[string, string]>;
	reactors: ReactorSpec[];
};

/** The sixteen orders: each of four lists declared forwards or backwards. */
const orders = Array.from({ length: 16 }, (_, mask) => ({
	operations: (mask & 1) !== 0,
	events: (mask & 2) !== 0,
	reactors: (mask & 4) !== 0,
	lists: (mask & 8) !== 0,
}));
type Order = (typeof orders)[number];

const inOrder = <T>(items: T[], reversed: boolean) =>
	reversed ? [...items].reverse() : items;

/**
 * One context with one application service providing every operation and
 * event, declared in `order`. Every name is internal, so nothing but the
 * reactions is asked about.
 */
function build(spec: Spec, order: Order) {
	const ws = new Workspace("Rings", { description: "", version: "0" });
	const served = ws
		.addDomain("Shop", { description: "" })
		.addSubdomain("Selling", { description: "", type: "core" });
	const bc = ws.addBoundedContext("Shop", { description: "" }).serves(served);
	const app = bc.addService("Shop App", {
		description: "",
		type: "application",
	});
	const nodes = new Map<string, Consumable>();
	const starts = spec.reactors
		.filter((it) => (it.kind ?? "process") === "process")
		.map((it) => it.starts ?? `${it.name} Start`)
		.filter((it) => !spec.operations.includes(it));
	for (const name of inOrder([...spec.operations, ...starts], order.operations))
		nodes.set(
			name,
			app.provides(name, {
				description: "",
				type: "operation",
				internal: true,
			}),
		);
	for (const [name, raiser] of inOrder(spec.events, order.events)) {
		const event = app.provides(name, {
			description: "",
			type: "event",
			internal: true,
		});
		nodes.get(raiser)?.raises(event);
		nodes.set(name, event);
	}
	const at = (name: string) => {
		const node = nodes.get(name);
		if (!node) throw new Error(`no ${name} in the spec`);
		return node;
	};
	for (const [caller, called] of spec.calls ?? [])
		app.consumes(at(called), { by: [at(caller)] });
	for (const reactor of inOrder(spec.reactors, order.reactors)) {
		const on = inOrder(reactor.on, order.lists).map(at);
		const issues = inOrder(reactor.issues, order.lists).map(at);
		if (reactor.kind === "policy")
			bc.addPolicy(reactor.name, { description: "" })
				.on(...on)
				.issues(...issues);
		else
			bc.addProcess(reactor.name, { description: "" })
				.starts(at(reactor.starts ?? `${reactor.name} Start`))
				.on(...on)
				.issues(...issues)
				.ends(ending(at(reactor.ends ?? reactor.issues[0]!)));
	}
	return { ws, bc, at };
}

const ending = (node: Consumable) =>
	node.type === "event" ? node : node.completed();

const findings = (ws: Workspace) =>
	ws.validate().map((d) => [d.rule, d.message, d.ref.split("/").pop()]);

const roundTripped = (ws: Workspace) =>
	Workspace.fromSchema(JSON.parse(JSON.stringify(ws.toSchema())));

const loop = (...steps: string[]) =>
	`Reactions run in a cycle: ${steps.map((it) => `"${it}"`).join(" -> ")}; the chain triggers itself and nothing in the model says what ends it`;

const spawning = (process: string, ...steps: string[]) =>
	`Reactions run in a cycle that spawns instances: ${steps.map((it) => `"${it}"`).join(" -> ")}; what closes the ring starts "${process}" rather than continuing it, so every turn begins another instance and nothing in the model says what ends them`;

/** The same findings in every order, and after the JSON round trip. */
function expectInEveryOrder(
	spec: Spec,
	expected: string[][],
	extend?: (built: ReturnType<typeof build>) => void,
) {
	for (const order of orders) {
		const built = build(spec, order);
		extend?.(built);
		const label = JSON.stringify(order);
		expect([label, findings(built.ws)]).toEqual([label, expected]);
		expect([label, findings(roundTripped(built.ws))]).toEqual([
			label,
			expected,
		]);
	}
}

/** The audit's model: P's lifecycle P -> O -> E -> P beside feedback with R. */
const twoAlive: Spec = {
	operations: ["O", "F"],
	events: [
		["E", "O"],
		["G", "F"],
	],
	reactors: [
		{ name: "P", on: ["E", "G"], issues: ["O"] },
		{ name: "R", on: ["E"], issues: ["F"] },
	],
};
const twoAliveRing = [
	"reaction-cycle",
	loop("P", "O", "E", "R", "F", "G", "P"),
	"p",
];

describe("reaction-cycle finds feedback beside an exempt ring", () => {
	it("warns about two live processes beside one's own lifecycle", () => {
		expectInEveryOrder(twoAlive, [twoAliveRing]);
	});

	it("warns about three live processes beside a lifecycle", () => {
		expectInEveryOrder(
			{
				operations: ["O", "F", "K"],
				events: [
					["E", "O"],
					["H", "F"],
					["G", "K"],
				],
				reactors: [
					{ name: "P", on: ["E", "G"], issues: ["O"] },
					{ name: "R", on: ["E"], issues: ["F"] },
					{ name: "S", on: ["H"], issues: ["K"] },
				],
			},
			[
				[
					"reaction-cycle",
					loop("P", "O", "E", "R", "F", "H", "S", "K", "G", "P"),
					"p",
				],
			],
		);
	});

	it("warns about a policy feeding a process beside its lifecycle", () => {
		expectInEveryOrder(
			{
				operations: ["O", "F"],
				events: [
					["E", "O"],
					["G", "F"],
				],
				reactors: [
					{ name: "P", on: ["E", "G"], issues: ["O"] },
					{ name: "Q", kind: "policy", on: ["E"], issues: ["F"] },
				],
			},
			[["reaction-cycle", loop("Q", "F", "G", "P", "O", "E", "Q"), "q"]],
		);
	});

	// S is called: it starts on Book and ends on the fact its own Slot
	// raises, so P -> Book -> S -> Slot -> Booked -> P is P's lifecycle. R
	// hears the same fact while alive and feeds P back.
	it("warns about a live process beside a called one", () => {
		expectInEveryOrder(
			{
				operations: ["Book", "Slot", "F"],
				events: [
					["Booked", "Slot"],
					["G", "F"],
				],
				reactors: [
					{ name: "P", on: ["Booked", "G"], issues: ["Book"] },
					{ name: "R", on: ["Booked"], issues: ["F"] },
					{
						name: "S",
						starts: "Book",
						on: [],
						issues: ["Slot"],
						ends: "Booked",
					},
				],
			},
			[
				[
					"reaction-cycle",
					loop("P", "Book", "S", "Slot", "Booked", "R", "F", "G", "P"),
					"p",
				],
			],
		);
	});

	it("is quiet on the called process and the lifecycle alone", () => {
		expectInEveryOrder(
			{
				operations: ["Book", "Slot"],
				events: [["Booked", "Slot"]],
				reactors: [
					{ name: "P", on: ["Booked"], issues: ["Book"] },
					{
						name: "S",
						starts: "Book",
						on: [],
						issues: ["Slot"],
						ends: "Booked",
					},
				],
			},
			[],
		);
	});

	// Restart calls the operation P starts on, so every turn begins another
	// instance, beside P's lifecycle through E.
	it("reports a ring that spawns instances beside a lifecycle", () => {
		expectInEveryOrder(
			{
				operations: ["O", "Restart", "Begin"],
				events: [["E", "O"]],
				calls: [["Restart", "Begin"]],
				reactors: [
					{ name: "P", starts: "Begin", on: ["E"], issues: ["O", "Restart"] },
				],
			},
			[["reaction-cycle", spawning("P", "P", "Restart", "Begin", "P"), "p"]],
		);
	});

	// A deadline is P waking itself, a ring of one process; it must not be the
	// back edge that hides the feedback.
	it("warns about feedback beside a process's own deadline", () => {
		expectInEveryOrder(twoAlive, [twoAliveRing], ({ ws }) => {
			const p = [...ws.boundedcontexts.values()][0]!.processes.get(
				"p",
			) as Process;
			p.on(p.addDeadline("Late", { description: "", after: "1 day" }));
		});
	});

	// O sits behind a front whose service provides nothing else, so the
	// walk infers the call exactly as writing `by` would.
	it("warns about feedback through a local front with by inferred", () => {
		expectInEveryOrder(
			{ ...twoAlive, reactors: twoAlive.reactors },
			[
				[
					"reaction-cycle",
					loop("P", "Front", "O", "E", "R", "F", "G", "P"),
					"p",
				],
			],
			({ bc, at }) => {
				const p = bc.processes.get("p") as Process;
				const front = bc
					.addService("Front Desk", { description: "", type: "application" })
					.provides("Front", {
						description: "",
						type: "operation",
						internal: true,
					});
				front.provider.consumes(at("O"));
				p.commands.splice(0, p.commands.length, front);
				p.endEvents.splice(0, p.endEvents.length, front.completed());
			},
		);
	});
});

/**
 * A ring of bare calls that crosses contexts is `relationship-cycle`'s, so this
 * rule leaves it alone; one met first must not hide a ring of calls inside one
 * context through the same operations.
 */
describe("reaction-cycle finds calls inside one context beside calls across", () => {
	for (const acrossFirst of [true, false])
		it(`reports A -> B -> A with the crossing ring declared ${acrossFirst ? "first" : "second"}`, () => {
			const ws = new Workspace("Calls", { description: "", version: "0" });
			const alpha = ws.addBoundedContext("Alpha", { description: "" });
			const beta = ws.addBoundedContext("Beta", { description: "" });
			const one = alpha.addService("One", {
				description: "",
				type: "application",
			});
			const two = alpha.addService("Two", {
				description: "",
				type: "application",
			});
			const a = one.provides("A", { description: "", type: "operation" });
			const b = two.provides("B", { description: "", type: "operation" });
			const x = beta
				.addService("Far", { description: "", type: "application" })
				.provides("X", { description: "", type: "operation" });
			x.provider.consumes(b, { by: [x] });
			two.consumes(a, { by: [b] });
			if (acrossFirst) one.consumes(x, { by: [a] });
			one.consumes(b, { by: [a] });
			if (!acrossFirst) one.consumes(x, { by: [a] });
			expect(
				ws
					.validate()
					.filter((d) => d.rule === "reaction-cycle")
					.map((d) => d.message),
			).toEqual([
				'Calls run in a cycle: "A" -> "B" -> "A"; each of these calls the next and nothing on the ring reacts to anything, so it is a loop of calls rather than a chain of reactions',
			]);
		});
});

/**
 * Reading each call per caller multiplies states, and the walks that read them
 * keep their own stacks, so a large authored model is answered rather than
 * overflowing the engine's call stack (issue #108, PANIC audit).
 */
describe("reaction-cycle on large authored models", () => {
	const reactions = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "reaction-cycle")
			.map((d) => [d.message, d.ref.split("/").pop()]);

	// The audit's model: 100 policies on one shared event, each issuing its own
	// operation that raises it again. 201 nodes became 10,000 segments.
	it("reports each of a hundred policies retrying on one shared event", () => {
		const ws = new Workspace("Wide", { description: "", version: "0" });
		const bc = ws.addBoundedContext("Wide", { description: "" });
		const app = bc.addService("App", { description: "", type: "application" });
		const changed = app.provides("Changed", {
			description: "",
			type: "event",
			internal: true,
		});
		for (let i = 0; i < 100; i++) {
			const update = app
				.provides(`Update ${i}`, {
					description: "",
					type: "operation",
					internal: true,
				})
				.raises(changed);
			bc.addPolicy(`React ${i}`, { description: "" })
				.on(changed)
				.issues(update);
		}
		const expected = Array.from({ length: 100 }, (_, i) => [
			loop(`React ${i}`, `Update ${i}`, "Changed", `React ${i}`),
			`react_${i}`,
		]);
		expect(reactions(ws)).toEqual(expected);
		expect(reactions(roundTripped(ws))).toEqual(expected);
	});

	/**
	 * `count` reactors issuing one `hops`-long shared front chain. Policies
	 * each hear the event the chain's end raises for the next one, so every
	 * run of the chain wakes them all; processes instead wait on the chain's
	 * own answer, which comes back only to whichever of them made the call.
	 */
	function sharedFront(
		count: number,
		hops: number,
		kind: "relays" | "callers",
	) {
		const ws = new Workspace("Shared", { description: "", version: "0" });
		const bc = ws.addBoundedContext("Shared", { description: "" });
		const chain = Array.from({ length: hops }, (_, i) =>
			bc
				.addService(`Hop ${i} Handler`, {
					description: "",
					type: "application",
				})
				.provides(`Hop ${i}`, {
					description: "",
					type: "operation",
					internal: true,
				}),
		);
		chain.forEach((hop, i) => {
			if (i > 0) chain[i - 1]!.provider.consumes(hop);
		});
		const last = chain[hops - 1]!;
		for (let i = 0; i < count; i++) {
			if (kind === "callers") {
				const start = last.provider.provides(`Caller ${i} Start`, {
					description: "",
					type: "operation",
					internal: true,
				});
				bc.addProcess(`Caller ${i}`, { description: "" })
					.starts(start)
					.on(last.completed())
					.issues(chain[0]!)
					.ends(chain[0]!.completed());
				continue;
			}
			const reached = last.provider.provides(`Reached ${i}`, {
				description: "",
				type: "event",
				internal: true,
			});
			last.raises(reached);
		}
		if (kind === "relays")
			for (let i = 0; i < count; i++)
				bc.addPolicy(`Relay ${i}`, { description: "" })
					.on(last.provider.consumables.get(`reached_${(i + 1) % count}`)!)
					.issues(chain[0]!);
		return { ws, chain: chain.map((hop) => hop.name) };
	}

	// The lead's volume pin: every relay's own retry, each once and each as
	// the hops it actually runs, and not one closed walk per way the hundred
	// relays can be strung together through the shared chain.
	it("reports a hundred concise retries through a hundred-hop shared front", () => {
		const { ws, chain } = sharedFront(100, 100, "relays");
		const expected = Array.from({ length: 100 }, (_, i) => [
			loop(`Relay ${i}`, ...chain, `Reached ${(i + 1) % 100}`, `Relay ${i}`),
			`relay_${i}`,
		]).sort();
		for (const model of [ws, roundTripped(ws)]) {
			const found = reactions(model);
			expect(found).toHaveLength(100);
			expect([...found].sort()).toEqual(expected);
		}
	});

	// The same front issued by a hundred processes, each waiting on the
	// chain's answer to its own call: every one is a lifecycle, and the answer
	// another process's call brings back is nobody else's.
	it("reports nothing where a hundred callers each hear only their own answer", () => {
		const { ws } = sharedFront(100, 100, "callers");
		expect(reactions(ws)).toEqual([]);
		expect(reactions(roundTripped(ws))).toEqual([]);
	});

	// Ten relays each issue one thousand-hop front chain whose end raises every
	// relay's event: one depth-first path runs through each relay's own copy of
	// the chain, about ten thousand states deep.
	it("reports every relay's own retry through a long shared front", () => {
		const ws = new Workspace("Deep", { description: "", version: "0" });
		const bc = ws.addBoundedContext("Deep", { description: "" });
		const relays = 10;
		const hops = Array.from({ length: 1000 }, (_, i) =>
			bc
				.addService(`Hop ${i} Handler`, {
					description: "",
					type: "application",
				})
				.provides(`Hop ${i}`, {
					description: "",
					type: "operation",
					internal: true,
				}),
		);
		hops.forEach((hop, i) => {
			if (i > 0) hops[i - 1]!.provider.consumes(hop);
		});
		const last = hops[hops.length - 1]!;
		const reached = Array.from({ length: relays }, (_, i) => {
			const event = last.provider.provides(`Reached ${i}`, {
				description: "",
				type: "event",
				internal: true,
			});
			last.raises(event);
			return event;
		});
		for (let i = 0; i < relays; i++)
			bc.addPolicy(`Relay ${i}`, { description: "" })
				.on(reached[(i + 1) % relays]!)
				.issues(hops[0]!);
		const found = reactions(ws);
		const chain = hops.map((hop) => hop.name);
		for (let i = 0; i < relays; i++)
			expect(found).toContainEqual([
				loop(
					`Relay ${i}`,
					...chain,
					`Reached ${(i + 1) % relays}`,
					`Relay ${i}`,
				),
				`relay_${i}`,
			]);
		expect(
			found.every(([message]) =>
				message!.startsWith("Reactions run in a cycle: "),
			),
		).toBe(true);
		expect(reactions(roundTripped(ws))).toEqual(found);
	});
});
