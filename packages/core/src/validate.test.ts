import { describe, expect, it } from "vitest";
import { makeRichTestWs } from "./makeTestWs";
import { Workspace } from "./workspace";

const rulesOf = (ws: Workspace) =>
	ws.validate().map((d) => `${d.severity}:${d.rule}`);

function emptyWorkspace() {
	return new Workspace("V", {
		odsVersion: "1.0.0",
		description: "",
		version: "0",
	});
}

describe("Workspace.validate", () => {
	it("only warns about the deliberately unserved reporting context in the rich fixture", () => {
		const { ws, reportingBc } = makeRichTestWs();
		expect(ws.validate()).toEqual([
			expect.objectContaining({
				rule: "context-serves-subdomain",
				severity: "warning",
				ref: reportingBc.ref,
			}),
		]);
	});

	it("requires exactly one root entity per aggregate", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const none = bc.addAggregate("None", { description: "" });
		none.addEntity("E", { description: "" });
		const two = bc.addAggregate("Two", { description: "" });
		two.addRootEntity("A", { description: "" });
		two.addRootEntity("B", { description: "" });
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "aggregate-root");
		expect(diagnostics.map((d) => [d.severity, d.ref])).toEqual([
			["warning", none.ref],
			["error", two.ref],
		]);
	});

	it("only allows references to another aggregate's root", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const a = bc.addAggregate("A", { description: "" });
		const aRoot = a.addRootEntity("A", { description: "" });
		const b = bc.addAggregate("B", { description: "" });
		const bRoot = b.addRootEntity("B", { description: "" });
		const bLine = b.addEntity("Line", { description: "" });
		aRoot.references(bRoot, "ok");
		aRoot.references(bLine, "not root");
		aRoot.includes(bRoot, "not allowed");
		const messages = ws
			.validate()
			.filter((d) => d.rule === "cross-aggregate-reference")
			.map((d) => d.message);
		expect(messages).toHaveLength(2);
		expect(messages[0]).toContain("is not the root");
		expect(messages[1]).toContain('only "references" is allowed');
	});

	it("lets a relation cross an aggregate but not a bounded context", () => {
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		const orderAgg = sales.addAggregate("Order", { description: "" });
		const order = orderAgg.addRootEntity("Order", { description: "" });
		// Same context, other aggregate: allowed, and it must stay allowed.
		const basketAgg = sales.addAggregate("Basket", { description: "" });
		order.references(
			basketAgg.addRootEntity("Basket", { description: "" }),
			"from-basket",
		);
		// Another context: an error, whatever the relation says.
		const petAgg = catalog.addAggregate("Pet", { description: "" });
		const pet = petAgg.addRootEntity("Pet", { description: "" });
		order.references(pet, "for-pet");
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "cross-context-relation");
		expect(diagnostics).toEqual([
			{
				severity: "error",
				rule: "cross-context-relation",
				message:
					'"Order" in "Sales" references "Pet" in "Catalog"; a relation never crosses a bounded context, so hold "Pet"\'s identity as an attribute on "Order" instead',
				ref: order.ref,
			},
		]);
	});

	it("flags a cross-context relation from a value object too", () => {
		const ws = emptyWorkspace();
		const one = ws.addBoundedContext("One", { description: "" });
		const two = ws.addBoundedContext("Two", { description: "" });
		const here = one.addAggregate("Here", { description: "" });
		here.addRootEntity("Here", { description: "" });
		const vo = here.addValueObject("Vo", { description: "" });
		const there = two.addAggregate("There", { description: "" });
		vo.uses(there.addValueObject("Their Vo", { description: "" }), "borrows");
		const messages = ws
			.validate()
			.filter((d) => d.rule === "cross-context-relation")
			.map((d) => d.message);
		expect(messages).toEqual([
			'"Vo" in "One" uses "Their Vo" in "Two"; a relation never crosses a bounded context, so hold "Their Vo"\'s identity as an attribute on "Vo" instead',
		]);
	});

	it("warns when cross-context consumptions lack roles", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const svc = up.addService("S", { description: "", type: "application" });
		const op = svc.provides("Op", { description: "", type: "operation" });
		down
			.addService("T", { description: "", type: "application" })
			.consumes(op, {});
		const rules = ws.validate().filter((d) => d.rule === "role-coherence");
		expect(rules).toHaveLength(2);
	});

	it("flags consumptions between contexts that declared separate ways", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		up.separateWaysFrom(down);
		const op = up
			.addService("S", { description: "", type: "application" })
			.provides("Op", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		down
			.addService("T", { description: "", type: "application" })
			.consumes(op, { pattern: "conformist" });
		expect(rulesOf(ws)).toContain("error:separate-ways");
	});

	it("flags internal consumables consumed or joined from another context", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const evt = up
			.addService("S", { description: "", type: "application" })
			.provides("Happened", { description: "", type: "event", internal: true });
		down
			.addService("T", { description: "", type: "application" })
			.consumes(evt, { pattern: "conformist" });
		down.addPolicy("React", { description: "" }).on(evt);
		const rules = ws.validate().filter((d) => d.rule === "internal-consumable");
		expect(rules).toHaveLength(2);
		// Internal consumables are exempt from the upstream-role warning.
		expect(rulesOf(ws)).not.toContain("warning:role-coherence");
	});

	it("keeps payload schemas inside the publishing context", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const shape = a.addSchema("Shape");
		b.addService("S", { description: "", type: "application" }).provides("Op", {
			description: "",
			type: "operation",
			internal: true,
			pattern: "open-host-service",
			schema: shape,
		});
		expect(rulesOf(ws)).toContain("error:schema-context");
		expect(rulesOf(ws)).toContain("warning:internal-consumable");
	});

	it("keeps returned schemas inside the publishing context too", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const foreign = a.addSchema("Foreign");
		const own = b.addSchema("Own");
		const svc = b.addService("S", { description: "", type: "application" });
		svc.provides("Borrows", {
			description: "",
			type: "operation",
			schema: own,
			returns: foreign,
		});
		// The sent payload is fine on its own, so only returns may trip the rule.
		svc.provides("Fine", {
			description: "",
			type: "operation",
			schema: own,
			returns: own,
		});
		const rules = ws.validate().filter((d) => d.rule === "schema-context");
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining('"Borrows" returns schema "Foreign" from "A"'),
		]);
	});

	it("rejects returns on an event, and allows it on an operation", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const answer = bc.addSchema("Answer");
		const svc = bc.addService("S", { description: "", type: "application" });
		svc.provides("Asked", {
			description: "",
			type: "event",
			returns: answer,
		});
		svc.provides("Ask", {
			description: "",
			type: "operation",
			returns: answer,
		});
		const rules = ws
			.validate()
			.filter((d) => d.rule === "returns-on-operation");
		expect(rules).toHaveLength(1);
		expect(rules[0].severity).toBe("error");
		expect(rules[0].message).toContain(
			'"Asked" is an event but declares returns "Answer"',
		);
	});

	it("checks consumable kinds on policies and raises", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const svc = bc.addService("S", { description: "", type: "application" });
		const evt = svc.provides("Evt", { description: "", type: "event" });
		const op = svc.provides("Op", { description: "", type: "operation" });
		bc.addPolicy("Backwards", { description: "" }).on(op).then(evt);
		evt.raises(op);
		const rules = ws.validate().filter((d) => d.rule === "consumable-kind");
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining("is an operation, not an event"),
			expect.stringContaining("is an event, not an operation"),
			expect.stringContaining("declares raises"),
			expect.stringContaining('raises "Op", which is an operation'),
		]);
	});

	it("warns about incomplete policies", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		bc.addPolicy("Idle", { description: "" });
		expect(rulesOf(ws)).toContain("warning:policy-complete");
	});
});

describe("root-identity", () => {
	it("wants an identity attribute on the root, and only on the root", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const named = bc.addAggregate("Named", { description: "" });
		named
			.addRootEntity("Named", { description: "" })
			.addAttribute("Id", { type: "uuid", identity: true });
		// A non-root entity without an identity is nobody's business here.
		named.addEntity("Line", { description: "" });
		const nameless = bc.addAggregate("Nameless", { description: "" });
		const root = nameless.addRootEntity("Nameless", { description: "" });
		root.addAttribute("Label", { type: "string" });
		const rules = ws.validate().filter((d) => d.rule === "root-identity");
		expect(rules).toEqual([
			{
				severity: "error",
				rule: "root-identity",
				message:
					'Root entity "Nameless" of aggregate "Nameless" declares no identity attribute, so nothing says which "Nameless" a reference means',
				ref: root.ref,
			},
		]);
	});
});

describe("value-object-shape", () => {
	it("refuses an identity attribute and an includes on a value object", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("A", { description: "" });
		const root = agg.addRootEntity("A", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		const money = agg.addValueObject("Money", { description: "" });
		money.addAttribute("Amount", { type: "int64" });
		const bad = agg.addValueObject("Bad", { description: "" });
		bad.addAttribute("Key", { type: "string", identity: true });
		bad.includes(root, "owns");
		const rules = ws.validate().filter((d) => d.rule === "value-object-shape");
		expect(rules.map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"error",
				'Value object "Bad" marks attribute "Key" as an identity; two value objects with the same values are the same value, so it has no identity of its own',
				bad.ref,
			],
			[
				"error",
				'Value object "Bad" includes "A"; only an entity owns the lifecycle of what it includes, so "Bad" uses "A" instead',
				bad.ref,
			],
		]);
		// The well-formed value object next door stays quiet.
		expect(rules.every((d) => d.ref !== money.ref)).toBe(true);
	});
});

describe("aggregate-tree", () => {
	/** A root, one child, one value object, and a clean includes/uses pair. */
	function tidyAggregate() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		const line = agg.addEntity("Line", { description: "" });
		const money = agg.addValueObject("Money", { description: "" });
		root.includes(line, "has", "1..*");
		line.uses(money, "priced in", "1");
		line.addAttribute("Price", { type: "Money", valueobject: money });
		return { ws, agg, root, line, money };
	}

	const treeRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "aggregate-tree");

	it("is quiet on a root that includes entities and uses value objects", () => {
		expect(treeRules(tidyAggregate().ws)).toEqual([]);
	});

	it("refuses includes onto a value object and uses onto an entity", () => {
		const { ws, root, line, money } = tidyAggregate();
		root.includes(money, "wrong way round");
		root.uses(line, "also wrong");
		expect(treeRules(ws).map((d) => [d.severity, d.message])).toEqual([
			[
				"error",
				'"Order" includes "Money", which is a value object; "includes" points at an entity, and a value object is used',
			],
			[
				"error",
				'"Order" uses "Line", which is an entity; "uses" points at a value object, and an entity the aggregate owns is included',
			],
		]);
	});

	it("refuses an entity with two parents", () => {
		const { ws, agg, root, line } = tidyAggregate();
		const shared = agg.addEntity("Shared", { description: "" });
		root.includes(shared, "owns");
		line.includes(shared, "owns too");
		expect(treeRules(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"error",
				'"Shared" is included by "Order" and "Line" in aggregate "Order"; inside an aggregate an entity has exactly one parent',
				shared.ref,
			],
		]);
	});

	it("refuses a cycle of includes", () => {
		const { ws, root, line } = tidyAggregate();
		line.includes(root, "back up");
		expect(treeRules(ws).map((d) => [d.severity, d.message])).toEqual([
			[
				"error",
				'"Line" includes "Order", which already includes "Line" further up aggregate "Order"; "includes" forms a tree from the root, never a cycle',
			],
		]);
	});

	it("warns about an entity the root cannot be walked to", () => {
		const { ws, agg } = tidyAggregate();
		const stray = agg.addEntity("Stray", { description: "" });
		expect(treeRules(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"Stray" is in aggregate "Order" but no chain of "includes" or "references" reaches it from "Order", so nothing inside the boundary can get to it',
				stray.ref,
			],
		]);
	});

	it("counts a references as reaching an entity, and stays out of other aggregates", () => {
		const { ws, agg, root } = tidyAggregate();
		const referenced = agg.addEntity("Referenced", { description: "" });
		root.references(referenced, "points at");
		expect(treeRules(ws)).toEqual([]);
	});
});

describe("invariant-in-aggregate", () => {
	it("keeps every target of an invariant inside its own aggregate", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const order = bc.addAggregate("Order", { description: "" });
		const root = order.addRootEntity("Order", { description: "" });
		const total = root.addAttribute("Total", { type: "int64", identity: true });
		const other = bc.addAggregate("Customer", { description: "" });
		const customer = other.addRootEntity("Customer", { description: "" });
		customer.addAttribute("Id", { type: "uuid", identity: true });
		// Local targets, entity and attribute alike, are fine.
		order.addInvariant("Positive", { description: "" }).constrains(root, total);
		const stretched = order
			.addInvariant("Stretched", { description: "" })
			.constrains(customer);
		const rules = ws
			.validate()
			.filter((d) => d.rule === "invariant-in-aggregate");
		expect(rules).toEqual([
			{
				severity: "error",
				rule: "invariant-in-aggregate",
				message:
					'Invariant "Stretched" of aggregate "Order" constrains "Customer", which is in aggregate "Customer"; an invariant holds inside the boundary that is saved as one',
				ref: stretched.ref,
			},
		]);
	});
});

describe("attribute-relation-coherence", () => {
	/** An entity, a value object, and whatever the test decides to declare. */
	function pair() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		const money = agg.addValueObject("Money", { description: "" });
		return { ws, agg, root, money };
	}

	const coherenceRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "attribute-relation-coherence");

	it("is quiet when the attribute and the relation say the same thing", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", { type: "Money", valueobject: money });
		root.uses(money, "totalled in", "1");
		expect(coherenceRules(ws)).toEqual([]);
	});

	it("accepts a list attribute against a many-valued relation", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Instalments", { type: "Money[]", valueobject: money });
		root.uses(money, "paid in", "1..*");
		expect(coherenceRules(ws)).toEqual([]);
	});

	it("warns about an attribute with no relation and a relation with no attribute", () => {
		const { ws, agg, root, money } = pair();
		const size = agg.addValueObject("Size", { description: "" });
		root.addAttribute("Total", { type: "Money", valueobject: money });
		root.uses(size, "sized", "1");
		expect(coherenceRules(ws).map((d) => [d.severity, d.message])).toEqual([
			[
				"warning",
				'"Order" types attribute "Total" by value object "Money" but declares no "uses" relation to "Money", so the relation map never draws it',
			],
			[
				"warning",
				'"Order" uses "Size" but no attribute of "Order" is typed by "Size", so the page says the relation exists and never shows where',
			],
		]);
	});

	it("warns when a list attribute has a single-valued relation", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Instalments", { type: "Money[]", valueobject: money });
		root.uses(money, "paid in", "0..1");
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "Instalments" as a list ("Money[]") but its "uses" relation to "Money" has cardinality "0..1"',
		]);
	});

	it("warns when the attribute's type does not name the value object", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", { type: "decimal", valueobject: money });
		root.uses(money, "totalled in", "1");
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "Total" as "decimal" but points it at value object "Money"; the type a reader sees should be "Money" or "Money[]"',
		]);
	});
});

describe("relationship-roles-backed", () => {
	/** Upstream and downstream contexts, one consumable, one consumption. */
	function crossing(
		consumablePattern: "open-host-service" | "published-language" | undefined,
		consumptionPattern: "conformist" | "anti-corruption-layer" | undefined,
	) {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const op = up
			.addService("S", { description: "", type: "application" })
			.provides("Op", {
				description: "",
				type: "operation",
				pattern: consumablePattern,
			});
		const consumer = down.addService("T", {
			description: "",
			type: "application",
		});
		consumer.consumes(op, { pattern: consumptionPattern });
		return { ws, up, down, consumer };
	}

	const backedRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "relationship-roles-backed");

	it("is quiet when the traffic carries the roles the relationship claims", () => {
		const { ws, up, down } = crossing(
			"open-host-service",
			"anti-corruption-layer",
		);
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(backedRules(ws)).toEqual([]);
	});

	it("warns about an upstream role nothing crossing carries", () => {
		const { ws, up, down } = crossing(undefined, "anti-corruption-layer");
		const relationship = up.upstreamOf(down, {
			upstreamRoles: ["published-language"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(backedRules(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"Up" is declared published-language to "Down", but nothing "Down" consumes from "Up" carries that upstream role',
				relationship.ref,
			],
		]);
	});

	it("warns about a downstream role no consumption declares", () => {
		const { ws, up, down } = crossing("open-host-service", undefined);
		const relationship = up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: ["anti-corruption-layer"],
		});
		expect(backedRules(ws).map((d) => [d.message, d.ref])).toEqual([
			[
				'"Down" is declared anti-corruption-layer to "Up", but no consumption of "Down" from "Up" declares that downstream role',
				relationship.ref,
			],
		]);
	});

	it("warns about a consumption whose role the relationship never declares", () => {
		const { ws, up, down, consumer } = crossing(
			"open-host-service",
			"conformist",
		);
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service"],
			downstreamRoles: [],
		});
		expect(backedRules(ws).map((d) => [d.message, d.ref])).toEqual([
			[
				'"T" consumes "Op" from "Up" as conformist, a downstream role the upstream-downstream relationship between "Up" and "Down" does not declare',
				consumer.ref,
			],
		]);
	});

	it("leaves symmetric relationships alone; they have no roles to back", () => {
		const { ws, up, down } = crossing(undefined, undefined);
		up.partnerOf(down);
		expect(backedRules(ws)).toEqual([]);
	});
});

describe("mud-needs-acl", () => {
	/** A legacy provider and one consumer, with the consumption's role to taste. */
	function fromLegacy(
		pattern: "conformist" | "anti-corruption-layer" | undefined,
		bigBallOfMud = true,
	) {
		const ws = emptyWorkspace();
		const legacy = ws.addBoundedContext("Legacy", {
			description: "",
			bigBallOfMud,
		});
		const modern = ws.addBoundedContext("Modern", { description: "" });
		const op = legacy
			.addService("S", { description: "", type: "application" })
			.provides("Get Customer", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		const consumer = modern.addService("T", {
			description: "",
			type: "application",
		});
		consumer.consumes(op, { pattern });
		return { ws, consumer };
	}

	const mudRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "mud-needs-acl");

	it("accepts an anti-corruption layer over the mud", () => {
		expect(mudRules(fromLegacy("anti-corruption-layer").ws)).toEqual([]);
	});

	it("says nothing about a context that is not a big ball of mud", () => {
		expect(mudRules(fromLegacy("conformist", false).ws)).toEqual([]);
	});

	it("warns about a conformist consumption of the mud", () => {
		const { ws, consumer } = fromLegacy("conformist");
		expect(mudRules(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"Modern" consumes "Get Customer" from "Legacy" as a conformist, and "Legacy" is a big ball of mud; translate it behind an anti-corruption layer so its model stays out of "Modern"',
				consumer.ref,
			],
		]);
	});

	it("warns about a consumption of the mud with no role at all", () => {
		const { ws } = fromLegacy(undefined);
		expect(mudRules(ws).map((d) => d.message)).toEqual([
			'"Modern" consumes "Get Customer" from "Legacy" without declaring a downstream role, and "Legacy" is a big ball of mud; translate it behind an anti-corruption layer so its model stays out of "Modern"',
		]);
	});
});

describe("role-coherence and symmetric relationships", () => {
	/** Two contexts exchanging one consumable with no roles on either end. */
	function bareExchange() {
		const ws = emptyWorkspace();
		const one = ws.addBoundedContext("One", { description: "" });
		const two = ws.addBoundedContext("Two", { description: "" });
		const op = one
			.addService("S", { description: "", type: "application" })
			.provides("Op", { description: "", type: "operation" });
		two
			.addService("T", { description: "", type: "application" })
			.consumes(op, {});
		return { ws, one, two };
	}

	it("still warns when the two contexts are not partners", () => {
		const { ws } = bareExchange();
		expect(
			ws.validate().filter((d) => d.rule === "role-coherence"),
		).toHaveLength(2);
	});

	it("goes quiet between partners", () => {
		const { ws, one, two } = bareExchange();
		one.partnerOf(two);
		expect(ws.validate().filter((d) => d.rule === "role-coherence")).toEqual(
			[],
		);
	});

	it("goes quiet between contexts sharing a kernel", () => {
		const { ws, one, two } = bareExchange();
		one.sharesKernelWith(two);
		expect(ws.validate().filter((d) => d.rule === "role-coherence")).toEqual(
			[],
		);
	});

	it("keeps warning when the two contexts went separate ways", () => {
		const { ws, one, two } = bareExchange();
		one.separateWaysFrom(two);
		expect(
			ws.validate().filter((d) => d.rule === "role-coherence"),
		).toHaveLength(2);
	});
});

describe("term-in-context", () => {
	it("keeps a term's embodiment inside the term's own context", () => {
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		const orderAgg = sales.addAggregate("Order", { description: "" });
		orderAgg
			.addRootEntity("Order", { description: "" })
			.addAttribute("Id", { type: "uuid", identity: true });
		const petAgg = catalog.addAggregate("Pet", { description: "" });
		const pet = petAgg.addRootEntity("Pet", { description: "" });
		pet.addAttribute("Id", { type: "uuid", identity: true });
		// Local embodiments, and a term with none at all, are fine.
		sales.addTerm("Order", { definition: "", embodiedBy: orderAgg });
		sales.addTerm("Basket", { definition: "" });
		const foreign = sales.addTerm("Pet", { definition: "", embodiedBy: pet });
		const rules = ws.validate().filter((d) => d.rule === "term-in-context");
		expect(rules).toEqual([
			{
				severity: "error",
				rule: "term-in-context",
				message:
					'Glossary term "Pet" of "Sales" is embodied by "Pet", which is not part of "Sales"; a term belongs to the language of one context, and the same word means something else next door',
				ref: foreign.ref,
			},
		]);
	});
});

describe("separate-ways and policies", () => {
	/** Two contexts, one event, and a policy in the other reacting to it. */
	function subscription() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const evt = up
			.addService("S", { description: "", type: "application" })
			.provides("Happened", {
				description: "",
				type: "event",
				pattern: "published-language",
			});
		const op = down
			.addService("T", { description: "", type: "application" })
			.provides("React", { description: "", type: "operation" });
		const policy = down.addPolicy("On Happened", { description: "" });
		policy.on(evt).then(op);
		return { ws, up, down, policy };
	}

	it("says nothing while the contexts have not declared separate ways", () => {
		const { ws } = subscription();
		expect(ws.validate().filter((d) => d.rule === "separate-ways")).toEqual([]);
	});

	it("flags a policy subscribed to a context it went separate ways from", () => {
		const { ws, up, down, policy } = subscription();
		up.separateWaysFrom(down);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "separate-ways")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'Policy "On Happened" in "Down" reacts to "Happened" from "Up" although the contexts declare separate ways',
				policy.ref,
			],
		]);
	});
});

describe("comments-required", () => {
	/** Two contexts, one commented relationship and one bare one. */
	function twoRelationships(options?: Workspace["options"]) {
		const ws = new Workspace("V", {
			odsVersion: "1.0.0",
			description: "",
			version: "0",
			options,
		});
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const c = ws.addBoundedContext("C", { description: "" });
		a.upstreamOf(b, { comments: [{ text: "B reads A through an ACL." }] });
		const bare = a.partnerOf(c);
		return { ws, bare };
	}

	const commentsRequiredIn = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "comments-required");

	it("is off unless the workspace opts in", () => {
		expect(commentsRequiredIn(twoRelationships().ws)).toEqual([]);
		expect(commentsRequiredIn(twoRelationships({}).ws)).toEqual([]);
		expect(commentsRequiredIn(twoRelationships({ rules: {} }).ws)).toEqual([]);
		expect(
			commentsRequiredIn(
				twoRelationships({ rules: { commentsRequired: false } }).ws,
			),
		).toEqual([]);
	});

	it("warns once per uncommented relationship, at that relationship's ref", () => {
		const { ws, bare } = twoRelationships({
			rules: { commentsRequired: true },
		});
		expect(commentsRequiredIn(ws)).toEqual([
			{
				severity: "warning",
				rule: "comments-required",
				message: expect.stringContaining("nothing is written down"),
				ref: bare.ref,
			},
		]);
	});

	it("names both contexts and the type, so the Problems row reads on its own", () => {
		const { ws } = twoRelationships({ rules: { commentsRequired: true } });
		const [warning] = commentsRequiredIn(ws);
		expect(warning.message).toContain('"A"');
		expect(warning.message).toContain('"C"');
		expect(warning.message).toContain("partnership");
	});

	it("goes quiet once the relationship carries a comment", () => {
		const { ws, bare } = twoRelationships({
			rules: { commentsRequired: true },
		});
		bare.comments.push({ text: "A and C release together, see ADR-014." });
		expect(commentsRequiredIn(ws)).toEqual([]);
	});

	it("ignores uncommented consumables and consumptions, which are not relationships", () => {
		const { ws, bare } = twoRelationships({
			rules: { commentsRequired: true },
		});
		bare.comments.push({ text: "Documented." });
		const a = ws.getBoundedContextByRefOrThrow("#/boundedcontexts/a");
		const b = ws.getBoundedContextByRefOrThrow("#/boundedcontexts/b");
		const svc = a.addService("S", { description: "", type: "application" });
		const op = svc.provides("Op", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		b.addService("T", { description: "", type: "application" }).consumes(op, {
			pattern: "conformist",
		});

		expect(op.comments).toEqual([]);
		expect(commentsRequiredIn(ws)).toEqual([]);
	});

	it("survives the round trip, so the option is a property of the file", () => {
		const { ws } = twoRelationships({ rules: { commentsRequired: true } });
		const rebuilt = Workspace.fromSchema(
			JSON.parse(JSON.stringify(ws.toSchema())),
		);
		expect(rebuilt.options).toEqual({ rules: { commentsRequired: true } });
		expect(commentsRequiredIn(rebuilt)).toHaveLength(1);
	});

	it("writes no options key when the workspace sets none", () => {
		const schema = JSON.parse(JSON.stringify(twoRelationships().ws.toSchema()));
		expect(schema).not.toHaveProperty("options");
	});
});
