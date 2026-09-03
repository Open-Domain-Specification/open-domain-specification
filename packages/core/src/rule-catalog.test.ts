import { describe, expect, it } from "vitest";
import { RULE_CATALOG } from "./validate";
import { Workspace } from "./workspace";

/** A workspace that trips every rule at least once. */
function everythingWrong(): Workspace {
	const ws = new Workspace("Broken", {
		odsVersion: "1.0.0",
		description: "",
		version: "0",
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
	// role-coherence and internal-consumable and separate-ways
	const other = b.addAggregate("Other", { description: "" });
	other.addRootEntity("Other", { description: "" });
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
	// consumable-kind: event raises, policy on operation / then event
	plain.raises(carries);
	a.addPolicy("Backwards", { description: "" }).on(carries).then(plain);
	// policy-complete: empty policy
	a.addPolicy("Empty", { description: "" });
	// context-serves-subdomain: A and B serve nothing
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
