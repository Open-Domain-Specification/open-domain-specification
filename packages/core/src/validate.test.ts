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

	it("lets two aggregates of one context use the same value object", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		// Money belongs to the context, so holding one crosses no boundary and
		// neither aggregate has to declare its own (decision 16).
		const money = bc.addValueObject("Money", { description: "" });
		money.addAttribute("Amount", { type: "int64" });
		for (const name of ["Order", "Invoice"]) {
			const agg = bc.addAggregate(name, { description: "" });
			const root = agg.addRootEntity(name, { description: "" });
			root.addAttribute("Id", { type: "uuid", identity: true });
			root.addAttribute("Total", { type: "Money", valueobject: money });
			root.uses(money, "totalled in", "1");
		}
		// context-serves-subdomain is the fixture's own gap, not this one's.
		expect(
			ws.validate().filter((d) => d.rule !== "context-serves-subdomain"),
		).toEqual([]);
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
		one
			.addAggregate("Here", { description: "" })
			.addRootEntity("Here", { description: "" });
		const vo = one.addValueObject("Vo", { description: "" });
		vo.uses(two.addValueObject("Their Vo", { description: "" }), "borrows");
		const messages = ws
			.validate()
			.filter((d) => d.rule === "cross-context-relation")
			.map((d) => d.message);
		expect(messages).toEqual([
			'"Vo" in "One" uses "Their Vo" in "Two"; a relation never crosses a bounded context, so hold "Their Vo"\'s identity as an attribute on "Vo" instead',
		]);
	});

	it("lets an identity attribute name a root in another context", () => {
		const ws = emptyWorkspace();
		const sales = ws.addBoundedContext("Sales", { description: "" });
		const catalog = ws.addBoundedContext("Catalog", { description: "" });
		const order = sales
			.addAggregate("Order", { description: "" })
			.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const petAgg = catalog.addAggregate("Pet", { description: "" });
		const pet = petAgg.addRootEntity("Pet", { description: "" });
		pet.addAttribute("id", { type: "int64", identity: true });
		order.addAttribute("petId", { type: "int64", identifies: pet });
		const diagnostics = ws
			.validate()
			.filter((d) =>
				[
					"identifies-entity",
					"cross-context-relation",
					"schema-context",
				].includes(d.rule),
			);
		expect(diagnostics).toEqual([]);
	});

	it("lets an identity attribute name a child entity of another aggregate", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const orderAgg = bc.addAggregate("Order", { description: "" });
		const order = orderAgg.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const line = orderAgg.addEntity("Order Line", { description: "" });
		line.addAttribute("id", { type: "int64", identity: true });
		order.includes(line, "has-line", "*");
		const shipping = ws.addBoundedContext("Shipping", { description: "" });
		const parcel = shipping
			.addAggregate("Parcel", { description: "" })
			.addRootEntity("Parcel", { description: "" });
		parcel.addAttribute("id", { type: "int64", identity: true });
		parcel.addAttribute("lineId", { type: "int64", identifies: line });
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "identifies-entity");
		expect(diagnostics).toEqual([]);
	});

	it("lets a schema's attribute name a child entity too", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const orderAgg = bc.addAggregate("Order", { description: "" });
		const order = orderAgg.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const line = orderAgg.addEntity("Order Line", { description: "" });
		line.addAttribute("id", { type: "int64", identity: true });
		order.includes(line, "has-line", "*");
		const payload = bc.addSchema("Order Summary");
		payload.addAttribute("lineId", { type: "int64", identifies: line });
		const messages = ws
			.validate()
			.filter((d) => d.rule === "identifies-entity")
			.map((d) => d.message);
		expect(messages).toEqual([]);
	});

	it("flags an identity naming an entity this workspace does not have", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("Sales", { description: "" });
		const order = bc
			.addAggregate("Order", { description: "" })
			.addRootEntity("Order", { description: "" });
		order.addAttribute("id", { type: "int64", identity: true });
		const elsewhere = emptyWorkspace();
		const stranger = elsewhere
			.addBoundedContext("Catalog", { description: "" })
			.addAggregate("Pet", { description: "" })
			.addRootEntity("Pet", { description: "" });
		const petId = order.addAttribute("petId", {
			type: "int64",
			identifies: stranger,
		});
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "identifies-entity");
		expect(diagnostics).toEqual([
			{
				severity: "error",
				rule: "identifies-entity",
				message:
					'"Order" holds attribute "petId" as the identity of "Pet", which is not an entity of this workspace; an identity names an entity here, root or child, and a child is reached through its root',
				ref: petId.ref,
			},
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

	it("accepts a consumption made by the consumer's own operation or its context's policy", () => {
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
		const consumer = down.addService("T", {
			description: "",
			type: "application",
		});
		const renew = consumer.provides("Renew", {
			description: "",
			type: "operation",
			internal: true,
		});
		const react = down.addPolicy("React", { description: "" });
		consumer.consumes(evt, { pattern: "conformist", by: [renew, react] });
		expect(rulesOf(ws)).not.toContain("error:consumption-by-resolves");
	});

	it("flags a consumption made by another node's operation or another context's policy", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const provider = up.addService("S", {
			description: "",
			type: "application",
		});
		const op = provider.provides("Op", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const poll = provider.provides("Poll", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const elsewhere = up.addPolicy("Elsewhere", { description: "" });
		down
			.addService("T", { description: "", type: "application" })
			.consumes(op, { pattern: "conformist", by: [poll, elsewhere] });
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "consumption-by-resolves");
		expect(diagnostics).toHaveLength(2);
		expect(diagnostics[0].message).toContain('provided by "S"');
		expect(diagnostics[1].message).toContain('belongs to "Up"');
	});

	it("flags a consumption said to be made by one of the consumer's events", () => {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const op = up
			.addService("S", { description: "", type: "application" })
			.provides("Op", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			});
		const consumer = down.addService("T", {
			description: "",
			type: "application",
		});
		const raised = consumer.provides("Raised", {
			description: "",
			type: "event",
			internal: true,
		});
		consumer.consumes(op, { pattern: "conformist", by: [raised] });
		const diagnostics = ws
			.validate()
			.filter((d) => d.rule === "consumption-by-resolves");
		expect(diagnostics).toHaveLength(1);
		expect(diagnostics[0].message).toContain('the event "Raised"');
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

	it("lets a shared kernel carry a payload across, and nothing else", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const c = ws.addBoundedContext("C", { description: "" });
		a.sharesKernelWith(b);
		const shape = a.addSchema("Shape");
		b.addService("S", { description: "", type: "application" }).provides("Op", {
			description: "",
			type: "operation",
			schema: shape,
			returns: shape,
		});
		// C shares no kernel with A, so the same borrowing is still an error.
		c.addService("T", { description: "", type: "application" }).provides("Op", {
			description: "",
			type: "operation",
			schema: shape,
		});
		const rules = ws.validate().filter((d) => d.rule === "schema-context");
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining('"Op" carries schema "Shape" from "A"'),
		]);
	});

	it("keeps a nested schema in its own context, unless a kernel is shared", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const c = ws.addBoundedContext("C", { description: "" });
		a.sharesKernelWith(b);
		const line = a.addSchema("Order Line");
		// B shares a kernel with A, so it may nest A's shape; C may not.
		b.addSchema("Order Request").addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		const borrower = c.addSchema("Copy Request");
		const borrowed = borrower.addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "schema-context")
				.map((d) => [d.message, d.ref]),
		).toEqual([
			[
				'"Copy Request" types attribute "Lines" by schema "Order Line" from "A"; a payload belongs to the context that publishes it',
				borrowed.ref,
			],
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

	it("keeps the shapes an operation refuses with inside the publishing context", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const foreign = a.addSchema("Foreign");
		const own = b.addSchema("Own");
		const svc = b.addService("S", { description: "", type: "application" });
		// One rejection is borrowed and one is not, so only the borrowed one trips.
		svc.provides("Borrows", {
			description: "",
			type: "operation",
			rejects: [own, foreign],
		});
		const rules = ws.validate().filter((d) => d.rule === "schema-context");
		expect(rules.map((d) => d.message)).toEqual([
			expect.stringContaining(
				'"Borrows" rejects with schema "Foreign" from "A"',
			),
		]);
	});

	it("rejects a rejection on an event, and allows one on an operation", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const refusal = bc.addSchema("Refusal");
		const overLimit = bc.addSchema("Over Limit");
		const svc = bc.addService("S", { description: "", type: "application" });
		svc.provides("Happened", {
			description: "",
			type: "event",
			rejects: [refusal, overLimit],
		});
		svc.provides("Ask", {
			description: "",
			type: "operation",
			rejects: [refusal],
		});
		const rules = ws
			.validate()
			.filter((d) => d.rule === "rejects-on-operation");
		expect(rules).toHaveLength(1);
		expect(rules[0].severity).toBe("error");
		// Every rejection the event names is listed, so the fix is one edit.
		expect(rules[0].message).toContain(
			'"Happened" is an event but rejects with "Refusal", "Over Limit"',
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
		const money = bc.addValueObject("Money", { description: "" });
		money.addAttribute("Amount", { type: "int64" });
		const bad = bc.addValueObject("Bad", { description: "" });
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
		const money = bc.addValueObject("Money", { description: "" });
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

	it("allows an entity type included by two parent types, because an instance still has one parent", () => {
		const { ws, agg, root, line } = tidyAggregate();
		const shared = agg.addEntity("Shared", { description: "" });
		root.includes(shared, "owns");
		line.includes(shared, "owns too");
		expect(treeRules(ws)).toEqual([]);
	});

	it("allows an entity that includes its own type, which is a tree per instance", () => {
		const { ws, line } = tidyAggregate();
		line.includes(line, "nests");
		expect(treeRules(ws)).toEqual([]);
	});

	it("refuses a cycle of includes through two distinct entity types", () => {
		const { ws, root, line } = tidyAggregate();
		line.includes(root, "back up");
		expect(treeRules(ws).map((d) => [d.severity, d.message])).toEqual([
			[
				"error",
				'"Line" includes "Order", which already includes "Line" further up aggregate "Order"; with each holding the other there is no whole to start the instance tree from',
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
					'Invariant "Stretched" of aggregate "Order" constrains "Customer", which is in aggregate "Customer"; an aggregate\'s invariant holds inside the boundary on every save',
				ref: stretched.ref,
			},
		]);
	});

	it("lets an invariant name an operation of its own aggregate, but not a foreign one", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const order = bc.addAggregate("Order", { description: "" });
		order.addRootEntity("Order", { description: "" });
		const approve = order.provides("Approve", {
			description: "",
			type: "operation",
			internal: true,
		});
		const app = bc.addService("App", { description: "", type: "application" });
		const submit = app.provides("Submit", {
			description: "",
			type: "operation",
		});
		// The transition rule names the operation that makes the transition.
		order
			.addInvariant("Once Approved", { description: "" })
			.constrains(approve);
		const misplaced = order
			.addInvariant("Reaches Out", { description: "" })
			.constrains(submit);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "invariant-in-aggregate")
				.map((d) => [d.message, d.ref]),
		).toEqual([
			[
				'Invariant "Reaches Out" of aggregate "Order" constrains "Submit", which is in no aggregate at all; an aggregate\'s invariant holds inside the boundary on every save',
				misplaced.ref,
			],
		]);
	});
});

describe("invariant-in-context", () => {
	it("lets a context's invariant reach across its own aggregates, and no further", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const order = bc.addAggregate("Order", { description: "" });
		const root = order.addRootEntity("Order", { description: "" });
		const customerId = root.addAttribute("Customer Id", { type: "uuid" });
		const basket = bc.addAggregate("Basket", { description: "" });
		basket.addRootEntity("Basket", { description: "" });
		const place = order.provides("Place", {
			description: "",
			type: "operation",
		});
		const elsewhere = ws.addBoundedContext("Elsewhere", { description: "" });
		const foreign = elsewhere.addAggregate("Ledger", { description: "" });
		const entry = foreign.addRootEntity("Entry", { description: "" });
		// One open order per customer: a rule about the aggregate's instances,
		// so it counts an attribute of one aggregate and is guarded by that
		// aggregate's operation. Both belong to this context, so nothing is
		// reported.
		bc.addInvariant("One Open Order Per Customer", {
			description: "",
		}).constrains(customerId, place);
		const foreignRule = bc
			.addInvariant("Reaches Out", { description: "" })
			.constrains(entry, place);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "invariant-in-context")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'Invariant "Reaches Out" of bounded context "BC" constrains "Entry", which is in bounded context "Elsewhere"; a context\'s invariant holds across its own aggregates and no further',
				foreignRule.ref,
			],
		]);
	});

	it("reports a target that sits in no context at all, such as a schema's attribute", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		agg.addRootEntity("Order", { description: "" });
		const place = agg.provides("Place", { description: "", type: "operation" });
		const payload = bc.addSchema("Place Order");
		const field = payload.addAttribute("Customer Id", { type: "uuid" });
		const rule = bc
			.addInvariant("Counts A Payload", { description: "" })
			.constrains(field, place);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "invariant-in-context")
				.map((d) => [d.message, d.ref]),
		).toEqual([
			[
				'Invariant "Counts A Payload" of bounded context "BC" constrains "Place Order.Customer Id", which is in no bounded context at all; a context\'s invariant holds across its own aggregates and no further',
				rule.ref,
			],
		]);
	});
});

describe("context-invariant-guarded", () => {
	it("requires an operation of the context to guard the rule", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		const customerId = root.addAttribute("Customer Id", { type: "uuid" });
		const place = agg.provides("Place", { description: "", type: "operation" });
		const placed = agg.provides("Placed", { description: "", type: "event" });
		bc.addInvariant("Guarded", { description: "" }).constrains(
			customerId,
			place,
		);
		// An event is not a guard: nothing can be refused after the fact.
		const byEvent = bc
			.addInvariant("Guarded By An Event", { description: "" })
			.constrains(customerId, placed);
		const unguarded = bc
			.addInvariant("Unguarded", { description: "" })
			.constrains(customerId);
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "context-invariant-guarded")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'Invariant "Guarded By An Event" of bounded context "BC" names no operation that guards it; a rule across instances is kept true by whoever checks it before acting',
				byEvent.ref,
			],
			[
				"error",
				'Invariant "Unguarded" of bounded context "BC" names no operation that guards it; a rule across instances is kept true by whoever checks it before acting',
				unguarded.ref,
			],
		]);
	});

	it("accepts an application service's operation as the guard", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		const customerId = root.addAttribute("Customer Id", { type: "uuid" });
		const app = bc.addService("Checkout", {
			description: "",
			type: "application",
		});
		const submit = app.provides("Submit", {
			description: "",
			type: "operation",
		});
		bc.addInvariant("One Open Order", { description: "" }).constrains(
			customerId,
			submit,
		);
		expect(
			ws.validate().filter((d) => d.rule === "context-invariant-guarded"),
		).toEqual([]);
	});
});

describe("attribute-one-shape", () => {
	it("refuses an attribute typed by a value object and a schema at once", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const money = bc.addValueObject("Money", { description: "" });
		const line = bc.addSchema("Order Line");
		const request = bc.addSchema("Order Request");
		// One shape each is fine, whichever of the two it is.
		request.addAttribute("Lines", { type: "OrderLine[]", schema: line });
		request.addAttribute("Total", { type: "Money", valueobject: money });
		const both = request.addAttribute("Both", {
			type: "Money",
			valueobject: money,
			schema: line,
		});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "attribute-one-shape")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'"Order Request" types attribute "Both" by both value object "Money" and schema "Order Line"; an attribute has one shape',
				both.ref,
			],
		]);
	});

	it("keeps a payload shape out of the model: only a schema's attribute names a schema", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const line = bc.addSchema("Order Line");
		const request = bc.addSchema("Order Request");
		// A schema nesting a schema is the whole point of decision 18.
		request.addAttribute("Lines", { type: "OrderLine[]", schema: line });
		const order = bc.addAggregate("Order", { description: "" });
		const root = order.addRootEntity("Order", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		const onEntity = root.addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		const address = bc.addValueObject("Address", { description: "" });
		const onValueObject = address.addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		expect(
			ws
				.validate()
				.filter((d) => d.rule === "attribute-one-shape")
				.map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'"Address" types attribute "Lines" by schema "Order Line", which is a payload shape at the context\'s boundary; an entity or value object names a value object instead',
				onValueObject.ref,
			],
			[
				"error",
				'"Order" types attribute "Lines" by schema "Order Line", which is a payload shape at the context\'s boundary; an entity or value object names a value object instead',
				onEntity.ref,
			],
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
		const money = bc.addValueObject("Money", { description: "" });
		return { ws, bc, agg, root, money };
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
		const { ws, bc, root, money } = pair();
		const size = bc.addValueObject("Size", { description: "" });
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

	// Decision 15: a type is free text, so the validator never asks it to spell
	// the value object's name. The trailing [] the cardinality check reads is
	// the one convention that survives.
	it("says nothing about a type that does not name the value object", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Total", { type: "decimal", valueobject: money });
		root.uses(money, "totalled in", "1");
		expect(coherenceRules(ws)).toEqual([]);
	});

	it("still reads a trailing [] on a free-text type as many", () => {
		const { ws, root, money } = pair();
		root.addAttribute("Instalments", { type: "decimal[]", valueobject: money });
		root.uses(money, "paid in", "1");
		expect(coherenceRules(ws).map((d) => d.message)).toEqual([
			'"Order" types attribute "Instalments" as a list ("decimal[]") but its "uses" relation to "Money" has cardinality "1"',
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

describe("policy-in-context", () => {
	/** Two contexts, an event crossing, and a policy that acts on the other. */
	function reachingPolicy() {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const upApp = up.addService("Up App", {
			description: "",
			type: "application",
		});
		const happened = upApp.provides("Happened", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		const react = upApp.provides("React", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		const downApp = down.addService("Down App", {
			description: "",
			type: "application",
		});
		const policy = down.addPolicy("On Happened", { description: "" });
		policy.on(happened);
		return { ws, down, downApp, react, policy };
	}

	const inContext = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "policy-in-context")
			.map((d) => [d.severity, d.message, d.ref]);

	it("flags a policy whose then names another context's operation", () => {
		const { ws, react, policy } = reachingPolicy();
		policy.then(react);
		expect(inContext(ws)).toEqual([
			[
				"error",
				'Policy "On Happened" in "Down" issues "React", which belongs to "Up"',
				policy.ref,
			],
		]);
	});

	it("says nothing when the policy names its own context's operation", () => {
		const { ws, downApp, react, policy } = reachingPolicy();
		const local = downApp.provides("React Locally", {
			description: "",
			type: "operation",
		});
		downApp.consumes(react, { pattern: "anti-corruption-layer" });
		policy.then(local);
		expect(inContext(ws)).toEqual([]);
	});

	it("leaves a policy reacting to another context's event alone", () => {
		const { ws, policy } = reachingPolicy();
		// `on` is a consumption and may cross; only `then` may not (decision 17).
		expect(policy.events).toHaveLength(1);
		expect(inContext(ws)).toEqual([]);
	});
});

describe("raises-in-context", () => {
	/** Two contexts, each with a service, an operation and an event of its own. */
	function twoContexts() {
		const ws = emptyWorkspace();
		const mine = ws.addBoundedContext("Mine", { description: "" });
		const theirs = ws.addBoundedContext("Theirs", { description: "" });
		const myApp = mine.addService("My App", {
			description: "",
			type: "application",
		});
		const theirApp = theirs.addService("Their App", {
			description: "",
			type: "application",
		});
		return {
			ws,
			myApp,
			theirApp,
			act: myApp.provides("Act", { description: "", type: "operation" }),
			myEvent: myApp.provides("It Happened", {
				description: "",
				type: "event",
			}),
			theirEvent: theirApp.provides("It Happened Over There", {
				description: "",
				type: "event",
				pattern: "published-language",
			}),
		};
	}

	const raises = (ws: Workspace) =>
		ws
			.validate()
			.filter((d) => d.rule === "raises-in-context")
			.map((d) => [d.severity, d.message, d.ref]);

	it("flags an operation that raises the context next door's event", () => {
		const { ws, act, theirEvent } = twoContexts();
		act.raises(theirEvent);
		expect(raises(ws)).toEqual([
			[
				"error",
				'"Act" raises "It Happened Over There", which belongs to "Theirs"; a context publishes its own facts, so "Mine" cannot raise another context\'s event',
				act.ref,
			],
		]);
	});

	it("says nothing when the event is the operation's own context's", () => {
		const { ws, act, myEvent } = twoContexts();
		act.raises(myEvent);
		expect(raises(ws)).toEqual([]);
	});

	it("leaves the honest way of acting over there alone", () => {
		// Consume the other context's operation and let it raise its own event:
		// the causal chain crosses through the consumption, not through raises.
		const { ws, myApp, theirApp, act, theirEvent } = twoContexts();
		const theirOp = theirApp
			.provides("Do It Over There", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(theirEvent);
		myApp.consumes(theirOp, { pattern: "conformist", by: [act] });
		expect(raises(ws)).toEqual([]);
	});
});

describe("aggregate-not-public and domain-service-internal", () => {
	/**
	 * One context with an aggregate and a domain service, and a second context
	 * ready to consume whatever the first offers.
	 */
	function inside() {
		const ws = emptyWorkspace();
		const own = ws.addBoundedContext("Own", { description: "" });
		const other = ws.addBoundedContext("Other", { description: "" });
		const agg = own.addAggregate("Thing", { description: "" });
		agg.addRootEntity("Thing", { description: "" }).addAttribute("Id", {
			type: "string",
			identity: true,
		});
		const rules = own.addService("Rules", {
			description: "",
			type: "domain",
		});
		const app = own.addService("App", {
			description: "",
			type: "application",
		});
		const outsider = other.addService("Outsider", {
			description: "",
			type: "application",
		});
		return { ws, own, agg, rules, app, outsider };
	}

	const boundary = (ws: Workspace) =>
		ws
			.validate()
			.filter(
				(d) =>
					d.rule === "aggregate-not-public" ||
					d.rule === "domain-service-internal",
			)
			.map((d) => [d.rule, d.severity, d.message, d.ref]);

	it("flags an aggregate operation that declares an upstream role", () => {
		const { ws, agg } = inside();
		const op = agg.provides("Reserve", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		expect(boundary(ws)).toEqual([
			[
				"aggregate-not-public",
				"error",
				'Aggregate "Thing" offers "Reserve" as open-host-service, but what "Own" offers outward is provided by an application service',
				op.ref,
			],
		]);
	});

	it("flags another context consuming an aggregate's operation", () => {
		const { ws, agg, outsider } = inside();
		const op = agg.provides("Reserve", {
			description: "",
			type: "operation",
			internal: true,
		});
		outsider.consumes(op, { pattern: "anti-corruption-layer" });
		expect(boundary(ws)).toEqual([
			[
				"aggregate-not-public",
				"error",
				'"Outsider" in "Other" consumes "Reserve", an operation of aggregate "Thing" internal to "Own"',
				outsider.ref,
			],
		]);
	});

	it("flags a domain service offering or lending out an operation", () => {
		const { ws, rules, outsider } = inside();
		const op = rules.provides("Decide", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		outsider.consumes(op, { pattern: "conformist" });
		expect(boundary(ws).map((d) => [d[0], d[3]])).toEqual([
			["domain-service-internal", op.ref],
			["domain-service-internal", outsider.ref],
		]);
	});

	it("says nothing when the application service fronts them both", () => {
		const { ws, agg, rules, app, outsider } = inside();
		const held = agg.provides("Reserve", {
			description: "",
			type: "operation",
			internal: true,
		});
		const decided = rules.provides("Decide", {
			description: "",
			type: "operation",
			internal: true,
		});
		const offered = app.provides("Reserve Thing", {
			description: "",
			type: "operation",
			pattern: "open-host-service",
		});
		app.consumes(held, {});
		app.consumes(decided, {});
		outsider.consumes(offered, { pattern: "anti-corruption-layer" });
		expect(boundary(ws)).toEqual([]);
	});

	it("leaves an aggregate's events alone, published or consumed abroad", () => {
		const { ws, agg, outsider } = inside();
		const raised = agg.provides("Thing Happened", {
			description: "",
			type: "event",
			pattern: "published-language",
		});
		// An aggregate still publishes the facts its context is known by; only
		// its operations stay inside (decision 17).
		outsider.consumes(raised, { pattern: "conformist" });
		expect(boundary(ws)).toEqual([]);
	});
});

describe("entity-identity", () => {
	/** An aggregate whose root is identified, and one plain entity beside it. */
	function aggregate() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		root.addAttribute("Order Id", { type: "uuid", identity: true });
		const line = agg.addEntity("Order Line", { description: "" });
		return { ws, bc, agg, root, line };
	}

	const identityRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "entity-identity");

	it("warns about a non-root entity with nothing identifying it, and says it is a value object", () => {
		const { ws, line } = aggregate();
		expect(
			identityRules(ws).map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"warning",
				'Entity "Order Line" in aggregate "Order" declares no identity attribute; an entity is what you tell apart from another holding the same values, so without one "Order Line" is a value object',
				line.ref,
			],
		]);
	});

	it("goes quiet once the entity says what identifies it", () => {
		const { ws, line } = aggregate();
		line.addAttribute("Line No", { type: "int", identity: true });
		expect(identityRules(ws)).toEqual([]);
	});

	it("wants an identity attribute, not just any attribute", () => {
		const { ws, line } = aggregate();
		line.addAttribute("Quantity", { type: "int" });
		expect(identityRules(ws)).toHaveLength(1);
	});

	it("leaves the root to root-identity, and says nothing about value objects", () => {
		const { ws, agg, bc, root } = aggregate();
		bc.addValueObject("Money", { description: "" });
		root.attributes.clear();
		// The root has no identity either now, but that is root-identity's error
		// to raise, not this rule's warning; and the value object never gets one.
		expect(identityRules(ws).map((d) => d.ref)).toEqual([
			agg.entities.get("order_line")?.ref,
		]);
		expect(ws.validate().some((d) => d.rule === "root-identity")).toBe(true);
	});
});

describe("identity-not-optional", () => {
	/** A root, an entity beside it, a value object and a schema, all in one context. */
	function model() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const agg = bc.addAggregate("Order", { description: "" });
		const root = agg.addRootEntity("Order", { description: "" });
		root.addAttribute("Order Id", { type: "uuid", identity: true });
		const money = bc.addValueObject("Money", { description: "" });
		const payload = bc.addSchema("Order Placed");
		return { ws, bc, agg, root, money, payload };
	}

	const optionalIdentity = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "identity-not-optional");

	it("says nothing while an identity is always present", () => {
		const { ws } = model();
		expect(optionalIdentity(ws)).toEqual([]);
	});

	it("errors when an identity is also marked optional, and points at the attribute", () => {
		const { ws, root } = model();
		const maybe = root.addAttribute("Legacy Id", {
			type: "uuid",
			identity: true,
			optional: true,
		});
		expect(
			optionalIdentity(ws).map((d) => [d.severity, d.message, d.ref]),
		).toEqual([
			[
				"error",
				'"Order" marks attribute "Legacy Id" as both an identity and optional; an identity that may be missing cannot say which "Order" a reference means',
				maybe.ref,
			],
		]);
	});

	it("leaves an optional attribute that is not an identity alone", () => {
		const { ws, root } = model();
		root.addAttribute("Note", { type: "string", optional: true });
		expect(optionalIdentity(ws)).toEqual([]);
	});

	it("reads value objects and schemas too, not only entities", () => {
		const { ws, money, payload } = model();
		const vo = money.addAttribute("Currency", {
			type: "string",
			identity: true,
			optional: true,
		});
		const field = payload.addAttribute("Order Id", {
			type: "uuid",
			identity: true,
			optional: true,
		});
		expect(optionalIdentity(ws).map((d) => d.ref)).toEqual([field.ref, vo.ref]);
	});
});

describe("relationship-cycle", () => {
	/**
	 * Three contexts, each with an application service, and a `step` that
	 * declares one upstream of another and backs the step with real traffic —
	 * a call or an event, because since decision 20 only calls make a ring.
	 */
	function three() {
		const ws = emptyWorkspace();
		const make = (name: string) => {
			const bc = ws.addBoundedContext(name, { description: "" });
			return {
				bc,
				app: bc.addService(`${name} App`, {
					description: "",
					type: "application",
				}),
			};
		};
		const a = make("A");
		const b = make("B");
		const c = make("C");
		type Context = ReturnType<typeof make>;
		const step = (
			from: Context,
			to: Context,
			carriedBy: "operation" | "event",
			type?: "customer-supplier",
		) => {
			const consumable = from.app.provides(
				`${from.bc.name} to ${to.bc.name} ${carriedBy}`,
				{ description: "", type: carriedBy },
			);
			to.app.consumes(consumable, {});
			return from.bc.upstreamOf(to.bc, { type });
		};
		return { ws, a, b, c, step };
	}

	const cycles = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "relationship-cycle");

	it("is quiet on a chain of calls that never closes, even a branching one", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "operation");
		step(a, c, "operation");
		expect(cycles(ws)).toEqual([]);
	});

	it("names the ring's contexts in order, and reports at a relationship on it", () => {
		const { ws, a, b, c, step } = three();
		const ab = step(a, b, "operation");
		step(b, c, "operation");
		step(c, a, "operation");
		expect(cycles(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'Calls run in a cycle: "A" -> "B" -> "C" -> "A"; each of these contexts shapes its model around the next, so every model on the ring is shaped around one that is shaped around itself and none can change first. Declare a partnership where two of them really do move as one, or reverse a dependency by turning that call into an event the other side reacts to',
				ab.ref,
			],
		]);
	});

	// Decision 20: an operation is answered before its caller can go on, so a
	// ring of calls blocks every team on it. Nobody waits for an event, so the
	// same ring of contexts joined by events is a shape the model may keep.
	it("says nothing about a ring carried by events", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "event");
		step(b, c, "event");
		step(c, a, "event");
		expect(cycles(ws)).toEqual([]);
	});

	it("warns about the same ring once each step is a call", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "operation");
		step(c, a, "operation");
		expect(cycles(ws)).toHaveLength(1);
	});

	it("takes a mutual pair of calls as a ring of two, and events as no ring at all", () => {
		const calls = three();
		calls.step(calls.a, calls.b, "operation");
		calls.step(calls.b, calls.a, "operation");
		expect(cycles(calls.ws)).toHaveLength(1);

		const events = three();
		events.step(events.a, events.b, "event");
		events.step(events.b, events.a, "event");
		expect(cycles(events.ws)).toEqual([]);
	});

	it("needs every step of the ring to be a call; one event breaks it", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "event");
		step(c, a, "operation");
		expect(cycles(ws)).toEqual([]);
	});

	it("ignores a declared relationship no traffic backs at all", () => {
		const { ws, a, b } = three();
		a.bc.upstreamOf(b.bc, {});
		b.bc.upstreamOf(a.bc, {});
		expect(cycles(ws)).toEqual([]);
	});

	it("counts customer-supplier as directed too, so a mixed ring still closes", () => {
		const { ws, a, b, step } = three();
		step(a, b, "operation");
		step(b, a, "operation", "customer-supplier");
		expect(cycles(ws)).toHaveLength(1);
	});

	it("reads the same way whichever end declared the ring first", () => {
		const forwards = three();
		forwards.step(forwards.a, forwards.b, "operation");
		forwards.step(forwards.b, forwards.c, "operation");
		forwards.step(forwards.c, forwards.a, "operation");
		const backwards = three();
		backwards.step(backwards.c, backwards.a, "operation");
		backwards.step(backwards.b, backwards.c, "operation");
		backwards.step(backwards.a, backwards.b, "operation");
		expect(cycles(backwards.ws).map((d) => d.message)).toEqual(
			cycles(forwards.ws).map((d) => d.message),
		);
	});

	it("reports a two-context ring once, not once per direction", () => {
		const { ws, a, b, step } = three();
		step(a, b, "operation");
		step(b, a, "operation");
		expect(cycles(ws)).toHaveLength(1);
	});

	it("leaves symmetric relationships out of the graph", () => {
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		b.bc.partnerOf(c.bc);
		c.bc.sharesKernelWith(a.bc);
		expect(cycles(ws)).toEqual([]);
	});

	it("reports each ring of distinct contexts once, not the walks that thread one twice", () => {
		// A -> B, B -> C, C -> B and C -> A: two rings, B/C and A/B/C. Walking
		// the relationships rather than the contexts would also report the closed
		// walk A -> B -> C -> B -> A, which tells a reader nothing new.
		const { ws, a, b, c, step } = three();
		step(a, b, "operation");
		step(b, c, "operation");
		step(c, b, "operation");
		step(c, a, "operation");
		expect(
			cycles(ws)
				.map((d) => d.message)
				.sort(),
		).toEqual(
			[
				'Calls run in a cycle: "A" -> "B" -> "C" -> "A"; each of these contexts shapes its model around the next, so every model on the ring is shaped around one that is shaped around itself and none can change first. Declare a partnership where two of them really do move as one, or reverse a dependency by turning that call into an event the other side reacts to',
				'Calls run in a cycle: "B" -> "C" -> "B"; each of these contexts shapes its model around the next, so every model on the ring is shaped around one that is shaped around itself and none can change first. Declare a partnership where two of them really do move as one, or reverse a dependency by turning that call into an event the other side reacts to',
			].sort(),
		);
	});
});

describe("shared-kernel-backed", () => {
	/** Two contexts sharing a kernel, each with something to share over it. */
	function kernel() {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const relationship = a.sharesKernelWith(b);
		return { ws, a, b, relationship };
	}

	const backed = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "shared-kernel-backed");

	it("warns about a kernel with nothing in it", () => {
		const { ws, relationship } = kernel();
		expect(backed(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"A" and "B" declare a shared kernel, but neither types an attribute by a value object the other declares or carries one of its schemas, so nothing is in the kernel',
				relationship.ref,
			],
		]);
	});

	it("goes quiet when one context types an attribute by the other's value object", () => {
		const { ws, a, b } = kernel();
		const status = a.addValueObject("Status", { description: "" });
		const agg = b.addAggregate("Stock", { description: "" });
		const root = agg.addRootEntity("Stock", { description: "" });
		root.addAttribute("Id", { type: "uuid", identity: true });
		root.addAttribute("Status", { type: "Status", valueobject: status });
		expect(backed(ws)).toEqual([]);
	});

	it("goes quiet when a consumable of one context carries the other's schema", () => {
		const { ws, a, b } = kernel();
		const shape = a.addSchema("Shape");
		b.addService("S", { description: "", type: "application" }).provides("Op", {
			description: "",
			type: "operation",
			schema: shape,
		});
		expect(backed(ws)).toEqual([]);
	});

	it("goes quiet when an attribute of one context nests the other's schema", () => {
		const { ws, a, b } = kernel();
		const line = a.addSchema("Order Line");
		b.addSchema("Order Request").addAttribute("Lines", {
			type: "OrderLine[]",
			schema: line,
		});
		expect(backed(ws)).toEqual([]);
	});

	it("says nothing about contexts that declare no shared kernel", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		a.partnerOf(ws.addBoundedContext("B", { description: "" }));
		expect(backed(ws)).toEqual([]);
	});
});

describe("partnership-backed", () => {
	/** Two partner contexts, each with a service to hang traffic on. */
	function partners() {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const relationship = a.partnerOf(b);
		return {
			ws,
			a,
			b,
			relationship,
			aApp: a.addService("A App", { description: "", type: "application" }),
			bApp: b.addService("B App", { description: "", type: "application" }),
		};
	}

	const backed = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "partnership-backed");

	it("warns about a partnership with no traffic at all, and says the other direction is not demanded", () => {
		const { ws, relationship } = partners();
		expect(backed(ws).map((d) => [d.severity, d.message, d.ref])).toEqual([
			[
				"warning",
				'"A" and "B" are declared partners, but nothing crosses between them in either direction; a partnership does not need traffic both ways — one team may consume everything and the other nothing and still share a release train — but with no exchange at all there is nothing holding the two together',
				relationship.ref,
			],
		]);
	});

	it("is quiet when the traffic only runs one way, because a joint release train needs no answer back", () => {
		const { ws, aApp, bApp } = partners();
		const fromA = aApp.provides("Thing", { description: "", type: "event" });
		bApp.consumes(fromA, {});
		expect(backed(ws)).toEqual([]);
	});

	it("goes quiet once something crosses each way", () => {
		const { ws, aApp, bApp } = partners();
		const fromA = aApp.provides("Thing", { description: "", type: "event" });
		const fromB = bApp.provides("Other Thing", {
			description: "",
			type: "event",
		});
		bApp.consumes(fromA, {});
		aApp.consumes(fromB, {});
		expect(backed(ws)).toEqual([]);
	});

	it("counts a policy reacting to the partner's event as traffic, as separate-ways does", () => {
		const { ws, a, aApp, bApp } = partners();
		const fromB = bApp.provides("Other Thing", {
			description: "",
			type: "event",
		});
		// The subscription is the only exchange there is: A consumes nothing from
		// B, and B nothing from A. It still backs the partnership, because it is
		// the same exchange told a different way.
		const act = aApp.provides("Act", { description: "", type: "operation" });
		a.addPolicy("On Other Thing", { description: "" }).on(fromB).then(act);
		expect(backed(ws)).toEqual([]);
	});

	it("says nothing about shared kernels or directed relationships", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		a.sharesKernelWith(b);
		a.upstreamOf(b, {});
		expect(backed(ws)).toEqual([]);
	});
});

describe("reaction-cycle", () => {
	/** A context with an application service to hang a reaction chain on. */
	function context() {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		return {
			ws,
			bc,
			app: bc.addService("App", { description: "", type: "application" }),
		};
	}

	const reactions = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "reaction-cycle");

	it("is quiet on a chain that ends", () => {
		const { ws, bc, app } = context();
		const placed = app.provides("Placed", { description: "", type: "event" });
		const invoiced = app.provides("Invoiced", {
			description: "",
			type: "event",
		});
		const invoice = app
			.provides("Invoice", { description: "", type: "operation" })
			.raises(invoiced);
		app
			.provides("Place", { description: "", type: "operation" })
			.raises(placed);
		bc.addPolicy("On Placed", { description: "" }).on(placed).then(invoice);
		expect(reactions(ws)).toEqual([]);
	});

	it("names the chain in order when it closes on itself", () => {
		const { ws, bc, app } = context();
		const placed = app.provides("Placed", { description: "", type: "event" });
		const place = app
			.provides("Place", { description: "", type: "operation" })
			.raises(placed);
		const policy = bc
			.addPolicy("On Placed", { description: "" })
			.on(placed)
			.then(place);
		expect(reactions(ws)).toHaveLength(1);
		const [diagnostic] = reactions(ws);
		expect(diagnostic.severity).toBe("warning");
		expect(diagnostic.message).toContain('"Place" -> "Placed"');
		expect(diagnostic.message).toContain('"Placed" -> "On Placed"');
		expect(diagnostic.message).toContain('"On Placed" -> "Place"');
		expect([place.ref, placed.ref, policy.ref]).toContain(diagnostic.ref);
	});

	it("follows the ring through two policies as well as one", () => {
		const { ws, bc, app } = context();
		const placed = app.provides("Placed", { description: "", type: "event" });
		const invoiced = app.provides("Invoiced", {
			description: "",
			type: "event",
		});
		const place = app
			.provides("Place", { description: "", type: "operation" })
			.raises(placed);
		const invoice = app
			.provides("Invoice", { description: "", type: "operation" })
			.raises(invoiced);
		bc.addPolicy("On Placed", { description: "" }).on(placed).then(invoice);
		bc.addPolicy("On Invoiced", { description: "" }).on(invoiced).then(place);
		expect(reactions(ws)).toHaveLength(1);
		expect(reactions(ws)[0].message).toContain('"On Invoiced"');
	});

	/**
	 * Two contexts, each acting on the other the way decision 17 requires: a
	 * policy issues a local operation, and that operation calls the far side's
	 * public one through a consumption whose `by` names it. The ring closes
	 * through both boundaries, and before card 69 the walk stopped at the first
	 * of them and the model validated clean (the architect review's probe 5).
	 */
	function twoContexts({
		bReacts = true,
		callBack = true,
	}: {
		bReacts?: boolean;
		callBack?: boolean;
	} = {}) {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const aApp = a.addService("A App", {
			description: "",
			type: "application",
		});
		const bApp = b.addService("B App", {
			description: "",
			type: "application",
		});
		const aEvent = aApp.provides("A Happened", {
			description: "",
			type: "event",
		});
		const bEvent = bApp.provides("B Happened", {
			description: "",
			type: "event",
		});
		const aPublic = aApp
			.provides("A Public", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(aEvent);
		const bPublic = bApp
			.provides("B Public", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
			})
			.raises(bEvent);
		const aLocal = aApp.provides("A Local", {
			description: "",
			type: "operation",
		});
		const bLocal = bApp.provides("B Local", {
			description: "",
			type: "operation",
		});
		// A's local operation either calls B's public one or only subscribes to
		// B's event; a subscription is not something the caller causes.
		aApp.consumes(callBack ? bPublic : bEvent, {
			pattern: "conformist",
			by: [aLocal],
		});
		bApp.consumes(aPublic, { pattern: "conformist", by: [bLocal] });
		a.addPolicy("A Policy", { description: "" }).on(aEvent).then(aLocal);
		if (bReacts)
			b.addPolicy("B Policy", { description: "" }).on(bEvent).then(bLocal);
		return { ws, a, b, aLocal, bLocal, aPublic, bPublic };
	}

	it("follows a consumption's by across a boundary and reports the ring, naming both contexts", () => {
		const { ws } = twoContexts();
		expect(reactions(ws)).toHaveLength(1);
		const [diagnostic] = reactions(ws);
		expect(diagnostic.message).toContain('"A Local" -> "B Public"');
		expect(diagnostic.message).toContain('"B Public" -> "B Happened"');
		expect(diagnostic.message).toContain('"B Happened" -> "B Policy"');
		expect(diagnostic.message).toContain('"B Policy" -> "B Local"');
		expect(diagnostic.message).toContain('"B Local" -> "A Public"');
		expect(diagnostic.message).toContain(
			'it runs through "A" and "B", so no one context can see the whole ring',
		);
	});

	it("is quiet when the chain ends at another context's event that no policy reacts to", () => {
		// B still publishes its fact; nobody over there acts on it, so the chain
		// stops at the foreign event instead of coming back.
		expect(reactions(twoContexts({ bReacts: false }).ws)).toEqual([]);
	});

	it("does not follow a consumption of an event, which the consumer reacts to rather than causes", () => {
		expect(reactions(twoContexts({ callBack: false }).ws)).toEqual([]);
	});
});

describe("disposition-needs-comment", () => {
	/** Two contexts and a relationship whose evidence the test decides. */
	function related(
		disposition?: "by-design" | "tolerated" | "refactor",
		comments?: Array<{ text: string }>,
	) {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const relationship = a.upstreamOf(b, { disposition, comments });
		return { ws, a, b, relationship };
	}

	const needsComment = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "disposition-needs-comment");

	it("says nothing when the intent is by-design, said or unsaid", () => {
		expect(needsComment(related().ws)).toEqual([]);
		expect(needsComment(related("by-design").ws)).toEqual([]);
	});

	it("warns about a tolerated relationship with nothing written down", () => {
		const { ws, relationship } = related("tolerated");
		expect(needsComment(ws).map((d) => [d.severity, d.message, d.ref])).toEqual(
			[
				[
					"warning",
					'The upstream-downstream between "A" and "B" is marked tolerated, but carries no comment saying what makes it so or what would clear it',
					relationship.ref,
				],
			],
		);
	});

	it("warns about a refactor the same way", () => {
		expect(needsComment(related("refactor").ws).map((d) => d.message)).toEqual([
			'The upstream-downstream between "A" and "B" is marked refactor, but carries no comment saying what makes it so or what would clear it',
		]);
	});

	it("goes quiet as soon as one comment explains it", () => {
		const { ws } = related("refactor", [
			{ text: "A reads B's tables directly; a read model is planned." },
		]);
		expect(needsComment(ws)).toEqual([]);
	});

	it("reaches a consumable, and a consumption at its consumer's ref", () => {
		const ws = emptyWorkspace();
		const a = ws.addBoundedContext("A", { description: "" });
		const b = ws.addBoundedContext("B", { description: "" });
		const aApp = a.addService("A App", {
			description: "",
			type: "application",
		});
		const bApp = b.addService("B App", {
			description: "",
			type: "application",
		});
		const feed = aApp.provides("Feed", {
			description: "",
			type: "event",
			pattern: "published-language",
			disposition: "tolerated",
		});
		bApp.consumes(feed, { pattern: "conformist", disposition: "refactor" });
		expect(needsComment(ws).map((d) => [d.ref, d.message])).toEqual([
			[
				feed.ref,
				'"Feed", provided by "A App" is marked tolerated, but carries no comment saying what makes it so or what would clear it',
			],
			[
				bApp.ref,
				'"B App"\'s consumption of "Feed" is marked refactor, but carries no comment saying what makes it so or what would clear it',
			],
		]);
	});

	it("leaves an internal consumable alone; it never crosses a boundary", () => {
		const ws = emptyWorkspace();
		const bc = ws.addBoundedContext("BC", { description: "" });
		const app = bc.addService("App", { description: "", type: "application" });
		app.provides("Housekeeping", {
			description: "",
			type: "event",
			internal: true,
			disposition: "refactor",
		});
		expect(needsComment(ws)).toEqual([]);
	});
});

describe("relationship-roles-backed and published languages", () => {
	/** An upstream context offering one consumable, and a downstream consuming it. */
	function crossingWithSchema(withSchema: boolean) {
		const ws = emptyWorkspace();
		const up = ws.addBoundedContext("Up", { description: "" });
		const down = ws.addBoundedContext("Down", { description: "" });
		const shape = up.addSchema("Order Summary");
		const op = up
			.addService("S", { description: "", type: "application" })
			.provides("Op", {
				description: "",
				type: "operation",
				pattern: "open-host-service",
				schema: withSchema ? shape : undefined,
			});
		down
			.addService("T", { description: "", type: "application" })
			.consumes(op, { pattern: "conformist" });
		up.upstreamOf(down, {
			upstreamRoles: ["open-host-service", "published-language"],
			downstreamRoles: ["conformist"],
		});
		return ws;
	}

	const backedRules = (ws: Workspace) =>
		ws.validate().filter((d) => d.rule === "relationship-roles-backed");

	it("takes a crossing consumable's schema as the published language, backing both roles at once", () => {
		expect(backedRules(crossingWithSchema(true))).toEqual([]);
	});

	it("still warns when nothing crossing carries a schema or the flag", () => {
		expect(
			backedRules(crossingWithSchema(false)).map((d) => d.message),
		).toEqual([
			'"Up" is declared published-language to "Down", but nothing "Down" consumes from "Up" carries that upstream role',
		]);
	});
});
