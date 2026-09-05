import { describe, expect, it } from "vitest";
import { RULE_CATALOG } from "./validate";
import { type Entity, Workspace } from "./workspace";

/** A root entity that belongs to some other workspace than the fixture's. */
function strangerEntity(): Entity {
	return new Workspace("Elsewhere", {
		odsVersion: "1.0.0",
		description: "",
		version: "0",
	})
		.addBoundedContext("Elsewhere", { description: "" })
		.addAggregate("Stranger", { description: "" })
		.addRootEntity("Stranger", { description: "" });
}

/** A workspace that trips every rule at least once. */
function everythingWrong(): Workspace {
	const ws = new Workspace("Broken", {
		odsVersion: "1.0.0",
		description: "",
		version: "0",
		// comments-required is opt-in, so the fixture has to ask for it to trip it.
		options: { rules: { commentsRequired: true } },
	});
	const a = ws.addBoundedContext("A", { description: "" });
	const b = ws.addBoundedContext("B", { description: "" });
	// aggregate-root: none and two
	const noRoot = a.addAggregate("NoRoot", { description: "" });
	const inner = noRoot.addEntity("Inner", { description: "" });
	const twoRoots = a.addAggregate("TwoRoots", { description: "" });
	const r1 = twoRoots.addRootEntity("R1", { description: "" });
	twoRoots.addRootEntity("R2", { description: "" });
	// cross-aggregate-reference: includes across aggregates, references non-root
	r1.includes(inner, "owns");
	r1.references(inner, "points-at");
	// identifies-entity: an identity naming an entity of a different workspace,
	// which this one cannot reach at all. A child of an aggregate here is fine.
	r1.addAttribute("innerId", { type: "string", identifies: inner });
	r1.addAttribute("strangerId", {
		type: "string",
		identifies: strangerEntity(),
	});
	// identity-not-optional: an identity that is allowed to go missing
	r1.addAttribute("maybeId", {
		type: "string",
		identity: true,
		optional: true,
	});
	// role-coherence and internal-consumable and separate-ways
	const other = b.addAggregate("Other", { description: "" });
	const otherRoot = other.addRootEntity("Other", { description: "" });
	// cross-context-relation: a relation reaching out of context A into B
	r1.references(otherRoot, "across-contexts");
	const plain = other.provides("Plain", { type: "event", description: "" });
	const secret = other.provides("Secret", {
		type: "event",
		description: "",
		internal: true,
		pattern: "published-language",
	});
	twoRoots.consumes(plain, {});
	twoRoots.consumes(secret, {});
	a.separateWaysFrom(b);
	// schema-context: payload from the other context
	const foreign = b.addSchema("Foreign");
	const carries = twoRoots.provides("Carries", {
		type: "operation",
		description: "",
		schema: foreign,
	});
	// returns-on-operation: an event that says what it gives back
	other.provides("Answered", {
		type: "event",
		description: "",
		returns: b.addSchema("Answer"),
	});
	// consumable-kind: event raises, policy on operation / then event
	plain.raises(carries);
	a.addPolicy("Backwards", { description: "" }).on(carries).then(plain);
	// policy-complete: empty policy
	a.addPolicy("Empty", { description: "" });
	// separate-ways again, this time reached through a policy subscription
	a.addPolicy("Listens Across", { description: "" }).on(plain).then(carries);
	// aggregate-not-public: an aggregate offering an operation outward, and a
	// second context reaching for it
	const reachIn = other.provides("Reach In", {
		type: "operation",
		description: "",
		pattern: "open-host-service",
	});
	a.addService("Reacher", { description: "", type: "application" }).consumes(
		reachIn,
		{},
	);
	// domain-service-internal: a domain service doing the same
	const engine = b.addService("Rules Engine", {
		description: "",
		type: "domain",
	});
	const decide = engine.provides("Decide", {
		type: "operation",
		description: "",
		pattern: "open-host-service",
	});
	twoRoots.consumes(decide, {});
	// policy-in-context: a policy acting inside the context next door
	a.addPolicy("Acts Elsewhere", { description: "" }).on(plain).then(reachIn);
	// root-identity: no root in this fixture declares an identity attribute
	// value-object-shape: a value object with an identity, and one that includes
	const vo = a.addValueObject("Vo", { description: "" });
	vo.addAttribute("Id", { type: "string", identity: true });
	vo.includes(r1, "owns-a-root");
	// aggregate-tree: includes onto a value object, uses onto an entity, a cycle
	// through two types, and an entity the root cannot be walked to. Twice is
	// included by two parent types and Child nests its own type; both are legal
	// per instance, so neither is expected to fire.
	const tree = a.addAggregate("Tree", { description: "" });
	const treeRoot = tree.addRootEntity("TreeRoot", { description: "" });
	const child = tree.addEntity("Child", { description: "" });
	const twice = tree.addEntity("Twice", { description: "" });
	tree.addEntity("Orphan", { description: "" });
	const shape = a.addValueObject("Shape", { description: "" });
	treeRoot.includes(child, "owns");
	treeRoot.includes(twice, "owns");
	child.includes(twice, "owns too");
	child.includes(child, "nests");
	child.includes(treeRoot, "back up");
	treeRoot.includes(shape, "includes a value object");
	child.uses(twice, "uses an entity");
	// invariant-in-aggregate: a rule reaching into another aggregate
	tree.addInvariant("Stretched", { description: "" }).constrains(r1);
	// attribute-relation-coherence: attribute without relation, relation
	// without attribute, and a list against a single-valued relation
	const coherence = a.addAggregate("Coherence", { description: "" });
	const holder = coherence.addRootEntity("Holder", { description: "" });
	const price = a.addValueObject("Price", { description: "" });
	const size = a.addValueObject("Size", { description: "" });
	const weight = a.addValueObject("Weight", { description: "" });
	const colour = a.addValueObject("Colour", { description: "" });
	holder.addAttribute("Price", { type: "Price", valueobject: price });
	holder.uses(size, "sized", "1");
	holder.uses(weight, "weighs", "0..1");
	holder.addAttribute("Weights", { type: "Weight[]", valueobject: weight });
	holder.uses(colour, "coloured", "1");
	holder.addAttribute("Shade", { type: "string", valueobject: colour });
	// attribute-one-shape: one attribute claiming a value object and a schema
	holder.addAttribute("Both", {
		type: "Colour",
		valueobject: colour,
		schema: a.addSchema("Both Ways"),
	});
	// term-in-context: A's glossary points at B's aggregate
	a.addTerm("Foreign Word", { definition: "", embodiedBy: other });
	// relationship-roles-backed and mud-needs-acl: a legacy context whose
	// declared roles nothing carries, consumed as a conformist
	const c = ws.addBoundedContext("C", { description: "", bigBallOfMud: true });
	const legacy = c.addService("Legacy", {
		description: "",
		type: "application",
	});
	const legacyFeed = legacy.provides("Legacy Feed", {
		type: "event",
		description: "",
	});
	const consumer = a.addService("Consumer", {
		description: "",
		type: "application",
	});
	// consumption-by-resolves: what makes the consumption is said to be an
	// operation of the provider, not of the consumer itself
	consumer.consumes(legacyFeed, {
		pattern: "conformist",
		by: [legacy.provides("Poll", { type: "operation", description: "" })],
	});
	// relationship-cycle: a call each way, which since decision 20 is what
	// makes a ring — A calls C's Ask, C calls A's Answer. The event feed above
	// would not have been enough on its own.
	consumer.consumes(
		legacy.provides("Ask", { type: "operation", description: "" }),
		{},
	);
	legacy.consumes(
		consumer.provides("Answer", { type: "operation", description: "" }),
		{},
	);
	c.upstreamOf(a, {
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
	});
	// relationship-cycle: A is upstream of C, and C is already upstream of A
	a.upstreamOf(c, {});
	// partnership-backed: partners with no traffic either way, and
	// disposition-needs-comment: a disposition on it with nothing written down
	b.partnerOf(c, { disposition: "refactor" });
	// shared-kernel-backed: a kernel declared with nothing in it
	const d = ws.addBoundedContext("D", { description: "" });
	d.sharesKernelWith(b);
	// context-serves-subdomain: A, B, C and D serve nothing
	return ws;
}

describe("RULE_CATALOG", () => {
	const diagnostics = everythingWrong().validate();

	it("has one entry per rule id, and no rule fires that is not catalogued", () => {
		const ids = RULE_CATALOG.map((r) => r.rule);
		expect(new Set(ids).size).toBe(ids.length);
		for (const d of diagnostics) expect(ids).toContain(d.rule);
	});

	it("declares every severity a rule emits, and every rule fires on the fixture", () => {
		for (const entry of RULE_CATALOG) {
			const fired = diagnostics.filter((d) => d.rule === entry.rule);
			expect(fired.length, entry.rule).toBeGreaterThan(0);
			for (const d of fired)
				expect(entry.severities, `${entry.rule} ${d.message}`).toContain(
					d.severity,
				);
		}
	});

	it("describes every rule in words", () => {
		for (const entry of RULE_CATALOG) {
			expect(entry.summary.length).toBeGreaterThan(20);
			expect(entry.why.length).toBeGreaterThan(20);
			expect(entry.fix.length).toBeGreaterThan(20);
		}
	});
});
