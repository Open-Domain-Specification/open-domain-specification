import { describe, expect, it } from "vitest";
import { aggregate, application, operation } from "./rule-cases.support";
import { RULE_CATALOG, validateWorkspace } from "./validate";
import { Workspace } from "./workspace";
import { SET_RULE_CATALOG, WorkspaceSet } from "./workspace-set";

/**
 * The validator over a set. Every file here has the same local ids as the
 * others, so a rule that keys, pairs or de-duplicates by `ref` or `id` merges
 * two things that are two, and says one thing where it should say two (or
 * says a thing was said twice when it was said once in each of two files).
 *
 * Each case builds one model file with `fill`, builds it twice into two
 * files, and asks the set: the diagnostic a file earns once alone it earns
 * once in each file, attributed to that file.
 */

type Ctx = ReturnType<typeof fileOf>["context"];

/** One complete file, with the domain every context serves. */
function fileOf(name: string) {
	const ws = new Workspace(name, { description: "", version: "0" });
	const subdomain = ws
		.addDomain("Domain", { description: "" })
		.addSubdomain("Domain.Sub", { type: "core", description: "" });
	const context = (title: string) =>
		ws.addBoundedContext(title, { description: "", subdomains: [subdomain] });
	return { ws, context };
}

/** Builds the same model into `names.length` files, each told its own name. */
function filled<T>(
	names: string[],
	fill: (file: ReturnType<typeof fileOf>) => T,
) {
	const files = names.map((name) => ({ name, ...fileOf(`Team ${name}`) }));
	const made = files.map((file) => fill(file));
	return { files, made };
}

const set = (files: Array<{ name: string; ws: Workspace }>) =>
	WorkspaceSet.fromWorkspaces(files.map((it) => [`${it.name}.json`, it.ws]));

/** The diagnostics of one rule, as the rule, the file and the ref that carry them. */
const of = (s: WorkspaceSet, rule: string) =>
	s
		.validate()
		.filter((d) => d.rule === rule)
		.map((d) => ({ rule: d.rule, file: d.file, ref: d.ref }));

/** Up offers `Ping`; Down calls it from an operation of its own. No relationship. */
function undeclaredCall(file: { context: Ctx }, declare = false) {
	const up = file.context("Up");
	const down = file.context("Down");
	if (declare)
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
	const ping = operation(application(up), "Ping", {
		pattern: "open-host-service",
	});
	const downApp = application(down);
	const act = operation(downApp, "Act", { internal: true });
	downApp.consumes(ping, { pattern: "anti-corruption-layer", by: [act] });
	return { up, down, ping, downApp, act };
}

describe("a rule keyed by a local ref says it once for each file that earns it", () => {
	it("relationship-declared: each file's undeclared pair is its own warning", () => {
		const alone = filled(["a"], (f) => undeclaredCall(f));
		expect(of(set(alone.files), "relationship-declared")).toEqual([
			{
				rule: "relationship-declared",
				file: "a.json",
				ref: alone.made[0].downApp.ref,
			},
		]);
		const two = filled(["a", "b"], (f) => undeclaredCall(f));
		const found = of(set(two.files), "relationship-declared");
		expect(found.map((it) => it.file)).toEqual(["a.json", "b.json"]);
		expect(found.map((it) => it.ref)).toEqual([
			two.made[0].downApp.ref,
			two.made[1].downApp.ref,
		]);
	});

	it("relationship-declared: a pair declared in the other file is declared", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const upA = a.context("Up");
		const downB = b.context("Down");
		const ping = operation(application(upA), "Ping", {
			pattern: "open-host-service",
		});
		const bApp = application(downB);
		const act = operation(bApp, "Act", { internal: true });
		bApp.consumes(ping, { pattern: "anti-corruption-layer", by: [act] });
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "relationship-declared")).toEqual([
			{ rule: "relationship-declared", file: "b.json", ref: bApp.ref },
		]);
		// Declared by A, the file of the upstream, the pair is described.
		upA.upstreamOf(downB, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(of(s, "relationship-declared")).toEqual([]);
		expect(a.ws.relationships).toHaveLength(1);
		expect(b.ws.relationships).toHaveLength(0);
	});

	it("relationship-duplicate: two files each declaring their own Up to Down are not duplicates", () => {
		const two = filled(["a", "b"], (f) => undeclaredCall(f, true));
		expect(of(set(two.files), "relationship-duplicate")).toEqual([]);
	});

	it("relationship-duplicate: the same pair declared twice in one file is one diagnostic, at that file", () => {
		const two = filled(["a", "b"], (f) => {
			const made = undeclaredCall(f, true);
			return made;
		});
		two.made[1].up.upstreamOf(two.made[1].down, {});
		expect(of(set(two.files), "relationship-duplicate")).toEqual([
			{
				rule: "relationship-duplicate",
				file: "b.json",
				ref: two.files[1].ws.relationships[1].ref,
			},
		]);
	});

	it("relationship-duplicate: the pair declared by both files is one pair, and the later declaration is the duplicate", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const up = a.context("Up");
		const down = b.context("Down");
		up.upstreamOf(down, {});
		const second = b.ws.addRelationship({
			type: "upstream-downstream",
			upstream: up,
			downstream: down,
			upstreamRoles: [],
			downstreamRoles: [],
			description: "",
		});
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "relationship-duplicate")).toEqual([
			{ rule: "relationship-duplicate", file: "b.json", ref: second.ref },
		]);
	});

	/** X and Y call each other on untranslated terms: the smallest ring. */
	function callRing(f: { context: Ctx }) {
		const x = f.context("X");
		const y = f.context("Y");
		const calls = (to: typeof x, caller: typeof x, name: string) => {
			to.upstreamOf(caller, {
				upstreamRoles: ["open-host-service"],
				downstreamRoles: ["conformist"],
			});
			const offered = operation(application(to, `${to.name} Offer`), name, {
				pattern: "open-host-service",
			});
			const app = application(caller, `${caller.name} Caller`);
			const act = operation(app, `Act on ${name}`, { internal: true });
			app.consumes(offered, { pattern: "conformist", by: [act] });
		};
		calls(x, y, "X Ping");
		calls(y, x, "Y Ping");
		return { x, y };
	}

	it("relationship-cycle: a ring in each of two files is two rings, one in each", () => {
		const one = filled(["a"], (f) => callRing(f));
		expect(of(set(one.files), "relationship-cycle")).toHaveLength(1);
		const two = filled(["a", "b"], (f) => callRing(f));
		const found = of(set(two.files), "relationship-cycle");
		expect(found.map((it) => it.file)).toEqual(["a.json", "b.json"]);
	});

	it("relationship-cycle: a ring through two files is reported once, not once from each side", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const x = a.context("X");
		const y = b.context("Y");
		const calls = (to: typeof x, caller: typeof x, name: string) => {
			to.upstreamOf(caller, {
				upstreamRoles: ["open-host-service"],
				downstreamRoles: ["conformist"],
			});
			const offered = operation(application(to, `${to.name} Offer`), name, {
				pattern: "open-host-service",
			});
			const app = application(caller, `${caller.name} Caller`);
			const act = operation(app, `Act on ${name}`, { internal: true });
			app.consumes(offered, { pattern: "conformist", by: [act] });
		};
		calls(x, y, "X Ping");
		calls(y, x, "Y Ping");
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "relationship-cycle")).toHaveLength(1);
	});

	/** A policy that reacts to an event its own operation raises. */
	function loop(f: { context: Ctx }) {
		const bc = f.context("Loop");
		const app = application(bc);
		const first = app.provides("First", { description: "", type: "event" });
		const act = operation(app, "Act", { internal: true });
		act.raises(first);
		operation(app, "Start", { internal: true }).raises(first);
		bc.addPolicy("Again", { description: "" }).on(first).issues(act);
		return { bc, first, act };
	}

	it("reaction-cycle: a loop in each of two files is two loops", () => {
		const one = filled(["a"], (f) => loop(f));
		expect(of(set(one.files), "reaction-cycle")).toHaveLength(1);
		const two = filled(["a", "b"], (f) => loop(f));
		expect(of(set(two.files), "reaction-cycle").map((it) => it.file)).toEqual([
			"a.json",
			"b.json",
		]);
	});

	it("reaction-cycle: a loop through the policies of two files is one loop", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const left = a.context("Left");
		const right = b.context("Right");
		const leftApp = application(left);
		const rightApp = application(right);
		const ping = leftApp.provides("Ping", { description: "", type: "event" });
		const pong = rightApp.provides("Pong", { description: "", type: "event" });
		const sayPong = operation(rightApp, "Say pong", { internal: true });
		const sayPing = operation(leftApp, "Say ping", { internal: true });
		sayPong.raises(pong);
		sayPing.raises(ping);
		left.addPolicy("Answer pong", { description: "" }).on(pong).issues(sayPing);
		right
			.addPolicy("Answer ping", { description: "" })
			.on(ping)
			.issues(sayPong);
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "reaction-cycle")).toHaveLength(1);
	});

	it("specialisation-cycle: a cycle of kinds in each of two files is two, and one through both is one", () => {
		const cyc = filled(["a", "b"], (f) => {
			const bc = f.context("Money");
			const one = bc.addValueObject("One", { description: "" });
			const two = bc.addValueObject("Two", {
				description: "",
				specialises: one,
			});
			one.specialises = two;
			return { one, two };
		});
		expect(
			of(set(cyc.files), "specialisation-cycle").map((it) => it.file),
		).toEqual(["a.json", "b.json"]);

		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const one = a.context("Money").addValueObject("One", { description: "" });
		const two = b
			.context("Money")
			.addValueObject("Two", { description: "", specialises: one });
		one.specialises = two;
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "specialisation-cycle")).toHaveLength(1);
	});

	it("consumption-once: the pair taken once in each file is not taken twice", () => {
		// No callers named, which is what the rule asks of a pair taken more than
		// once and of no pair taken once: two consumers that share a local ref are
		// not one consumer.
		const two = filled(["a", "b"], (f) => {
			const up = f.context("Up");
			const down = f.context("Down");
			up.upstreamOf(down, {
				upstreamRoles: ["open-host-service"],
				downstreamRoles: ["anti-corruption-layer"],
			});
			const ping = operation(application(up), "Ping", {
				pattern: "open-host-service",
			});
			application(down).consumes(ping, { pattern: "anti-corruption-layer" });
		});
		expect(of(set(two.files), "consumption-once")).toEqual([]);
	});

	it("consumption-once: a pair taken twice with no callers is one diagnostic per consumption, in its own file", () => {
		const two = filled(["a", "b"], (f) => {
			const made = undeclaredCall(f, true);
			made.downApp.consumes(made.ping, {
				pattern: "anti-corruption-layer",
				by: [made.act],
			});
			return made;
		});
		const found = of(set(two.files), "consumption-once");
		// One taker per file taking it twice: the second names the caller the
		// first did. Nothing from one file is counted into the other's pair.
		expect(found.map((it) => it.file)).toEqual(["a.json", "b.json"]);
		const [first] = found;
		expect(first.ref).toBe(two.made[0].downApp.consumptions[1].ref);
	});

	it("term-in-context: another file's element whose local ref begins like this context's is not part of it", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const ledgerA = a.context("Ledger");
		const ledgerB = b.context("Ledger");
		const term = ledgerA.addTerm("Book", { definition: "" });
		term.embody(ledgerB);
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(ledgerA.ref).toBe(ledgerB.ref);
		expect(of(s, "term-in-context")).toEqual([
			{ rule: "term-in-context", file: "a.json", ref: term.ref },
		]);
		// Its own context's element is part of it, whatever file asks.
		term.embody(ledgerA);
		expect(of(s, "term-in-context")).toEqual([]);
	});

	it("rejects-duplicate: one operation refusing with two schemas that share a ref is not refusing twice", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const declineA = a.context("Payments").addSchema("Decline");
		const paymentsB = b.context("Payments");
		const declineB = paymentsB.addSchema("Decline");
		expect(declineA.ref).toBe(declineB.ref);
		const pay = operation(application(paymentsB), "Pay", {
			rejects: [declineB, declineA],
		});
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "rejects-duplicate")).toEqual([]);
		// Naming the same schema twice is still the mistake the rule is for.
		pay.rejections.push({ schema: declineA, many: false, reasons: [] });
		expect(of(s, "rejects-duplicate")).toEqual([
			{ rule: "rejects-duplicate", file: "b.json", ref: pay.ref },
		]);
	});
});

describe("a rule that asks about the set reads the set", () => {
	it("identifies-entity: a real entity of another file of the set is an entity, one of a workspace outside it is not", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const outside = fileOf("Team Outside");
		const sales = aggregate(a.context("Sales"), "Order");
		const pet = aggregate(b.context("Catalogue"), "Pet");
		const stray = aggregate(outside.context("Catalogue"), "Pet");
		const own = sales.root.addAttribute("PetId", {
			type: "uuid",
			identifies: pet.root,
		});
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "identifies-entity")).toEqual([]);
		own.identifies = stray.root;
		expect(of(s, "identifies-entity")).toEqual([
			{ rule: "identifies-entity", file: "a.json", ref: own.ref },
		]);
	});

	it("valueobject-context: a kernel declared by the other file lets the borrow, and nothing declared does not", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const up = a.context("Up");
		const down = b.context("Down");
		const money = up.addValueObject("Money", { description: "" });
		money.addAttribute("Amount", { type: "int64" });
		const { root } = aggregate(down, "Order");
		root.addAttribute("Total", { type: "Money", valueobject: money });
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "valueobject-context").map((it) => it.file)).toEqual([
			"b.json",
		]);
		up.sharesKernelWith(down);
		expect(of(s, "valueobject-context")).toEqual([]);
		expect(a.ws.relationships).toHaveLength(1);
	});

	it("separate-ways: separate ways declared in one file is broken by a call from the other", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const up = a.context("Up");
		const down = b.context("Down");
		up.separateWaysFrom(down);
		const ping = operation(application(up), "Ping", {
			pattern: "open-host-service",
		});
		const downApp = application(down);
		const act = operation(downApp, "Act", { internal: true });
		downApp.consumes(ping, { pattern: "anti-corruption-layer", by: [act] });
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		const found = of(s, "separate-ways");
		expect(found.length).toBeGreaterThan(0);
		expect(found.every((it) => it.file === "b.json")).toBe(true);
	});

	it("rejection-raised: a policy of the other file that hears the event answers for it", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const sales = a.context("Sales");
		const other = b.context("Other");
		const app = application(sales);
		const refusal = sales.addSchema("Refusal");
		const refused = app.provides("Refused", {
			description: "",
			type: "event",
			schema: refusal,
		});
		operation(app, "Submit", { internal: true, rejects: [refusal] }).raises(
			refused,
		);
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "rejection-raised").map((it) => it.file)).toEqual(["a.json"]);
		const otherApp = application(other);
		const apologise = operation(otherApp, "Apologise", { internal: true });
		other
			.addPolicy("Apologise", { description: "" })
			.on(refused)
			.issues(apologise);
		expect(of(s, "rejection-raised")).toEqual([]);
	});

	it("comments-required: the option belongs to the file that sets it", () => {
		const a = new Workspace("Team A", {
			description: "",
			version: "0",
			options: { rules: { commentsRequired: true } },
		});
		const b = new Workspace("Team B", { description: "", version: "0" });
		for (const ws of [a, b]) {
			const sub = ws
				.addDomain("Domain", { description: "" })
				.addSubdomain("Domain.Sub", { type: "core", description: "" });
			const up = ws.addBoundedContext("Up", {
				description: "",
				subdomains: [sub],
			});
			const down = ws.addBoundedContext("Down", {
				description: "",
				subdomains: [sub],
			});
			up.upstreamOf(down, {});
		}
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a],
			["b.json", b],
		]);
		expect(of(s, "comments-required").map((it) => it.file)).toEqual(["a.json"]);
	});
});

describe("a guard's reactors are read across the set", () => {
	/**
	 * Sales states a precondition on a guard that its public front reaches
	 * after fetching the fact the rule names. Another context's policy that
	 * issues the guard is a call nobody here can vouch for, so it holds
	 * nothing and the rule is refused; with no such policy it is satisfied.
	 */
	function guarded(
		scope: "aggregate" | "context",
		reactor: "none" | "same file" | "other file",
	) {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const sales = a.context("Sales");
		const order = sales.addAggregate("Order", { description: "" });
		order
			.addRootEntity("Order", { description: "" })
			.addAttribute("id", { type: "uuid", identity: true });
		const fact = sales.addSchema("Fact");
		const value = fact.addAttribute("value", { type: "string" });
		const known = sales.addService("Known", {
			description: "",
			type: "application",
		});
		const read = known.provides("Read", {
			description: "",
			type: "operation",
			returns: fact,
		});
		const front = known.provides("Front", {
			description: "",
			type: "operation",
		});
		const guard = known.provides("Guard", {
			description: "",
			type: "operation",
			internal: true,
		});
		known.consumes(read, { by: [front] });
		known.consumes(guard, { by: [front] });
		(scope === "aggregate" ? order : sales)
			.addInvariant("Fact required", { description: "", precondition: true })
			.constrains(guard, value);
		if (reactor !== "none") {
			const elsewhere = (reactor === "same file" ? a : b).context("Elsewhere");
			const away = elsewhere.addService("Away", {
				description: "",
				type: "application",
			});
			const awayOp = away.provides("Away Op", {
				description: "",
				type: "operation",
			});
			const heard = away.provides("Elsewhere Heard", {
				description: "",
				type: "event",
				schema: fact,
			});
			awayOp.raises(heard);
			elsewhere
				.addPolicy("On Elsewhere", { description: "" })
				.on(heard)
				.issues(guard);
		}
		return WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
	}

	it.each(["aggregate", "context"] as const)(
		"invariant-in-%s: a policy of another file that issues the guard refuses the rule, as one of the same file does",
		(scope) => {
			const rule = `invariant-in-${scope}`;
			expect(of(guarded(scope, "none"), rule)).toEqual([]);
			const same = of(guarded(scope, "same file"), rule);
			const other = of(guarded(scope, "other file"), rule);
			expect(same).toHaveLength(1);
			expect(other).toEqual(same);
			expect(other[0].file).toBe("a.json");
		},
	);
});

describe("a workspace that is a file of a set", () => {
	it("validates as its file of the set, and validateWorkspace still judges it alone", () => {
		const a = fileOf("Team A");
		const b = fileOf("Team B");
		const up = a.context("Up");
		const down = b.context("Down");
		const ping = operation(application(up), "Ping", {
			pattern: "open-host-service",
		});
		const bApp = application(down);
		const act = operation(bApp, "Act", { internal: true });
		bApp.consumes(ping, { pattern: "anti-corruption-layer", by: [act] });
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		// The relationship is A's, so B alone has a call with no relationship; in
		// its set, the pair is described.
		expect(validateWorkspace(b.ws).map((d) => d.rule)).toContain(
			"relationship-declared",
		);
		expect(b.ws.validate().map((d) => d.rule)).not.toContain(
			"relationship-declared",
		);
		expect(b.ws.validate()).toEqual(
			s
				.validate()
				.filter((d) => d.file === "b.json")
				.map(({ file: _file, ...diagnostic }) => diagnostic),
		);
	});

	it("describes the two rules of a set the way the rules of a workspace are described", () => {
		expect(SET_RULE_CATALOG.map((it) => it.rule)).toEqual([
			"file-path-invalid",
			"workspace-id-unique",
		]);
		for (const rule of SET_RULE_CATALOG) {
			expect(rule.severities).toEqual(["error"]);
			expect(rule.summary.length).toBeGreaterThan(0);
			expect(rule.why.length).toBeGreaterThan(0);
			expect(rule.fix.length).toBeGreaterThan(0);
		}
		expect(RULE_CATALOG.map((it) => it.rule)).not.toContain(
			"file-path-invalid",
		);
	});
});

describe("the faults of a set", () => {
	it("workspace-id-unique: two files with one workspace id are both kept and the later one is reported", () => {
		const a = fileOf("Team");
		const b = fileOf("Team");
		const s = WorkspaceSet.fromWorkspaces([
			["a.json", a.ws],
			["b.json", b.ws],
		]);
		expect(of(s, "workspace-id-unique")).toEqual([
			{ rule: "workspace-id-unique", file: "b.json", ref: "#/id" },
		]);
		const [reported] = s
			.validate()
			.filter((d) => d.rule === "workspace-id-unique");
		expect(reported.message).toContain('"team"');
		expect(reported.message).toContain('"a.json"');
		expect(s.workspaces).toHaveLength(2);
	});

	it("file-path-invalid: a path the host offered that cannot be one is reported and left out, without a throw", () => {
		const good = new Workspace("Good", { description: "", version: "0" });
		const files = [
			["good.json", good.toSchema()],
			["../out.json", good.toSchema()],
			["good.json", good.toSchema()],
			["notes.txt", good.toSchema()],
			["a\\b.json", good.toSchema()],
			["./dot.json", good.toSchema()],
			["a//b.json", good.toSchema()],
			["Good.json", good.toSchema()],
		] as const;
		const s = WorkspaceSet.fromSchemas(files.map(([p, w]) => [p, w]));
		// `Good.json` is another file than `good.json`: paths are case-sensitive
		// here, and a host that cannot hold both says so itself.
		expect(s.workspaces.map((it) => it.file)).toEqual([
			"good.json",
			"Good.json",
		]);
		expect(s.rejected.map((it) => [it.file, it.cause])).toEqual([
			["../out.json", "escapes-root"],
			["good.json", "duplicate-path"],
			["notes.txt", "not-json"],
			["a\\b.json", "forbidden-character"],
			["./dot.json", "invalid-character"],
			["a//b.json", "empty-segment"],
		]);
		const faults = s.validate().filter((d) => d.rule === "file-path-invalid");
		expect(faults.map((d) => d.file)).toEqual([
			"../out.json",
			"good.json",
			"notes.txt",
			"a\\b.json",
			"./dot.json",
			"a//b.json",
		]);
		expect(faults.every((d) => d.severity === "error")).toBe(true);
	});
});
