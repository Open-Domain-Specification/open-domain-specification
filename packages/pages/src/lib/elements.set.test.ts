import { Workspace } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";
import {
	consumablesOf,
	invariantsNaming,
	policiesOf,
	processesOf,
	relationsNaming,
	termsEmbodying,
	termsOf,
	usagesOf,
} from "./elements";
import { crossingConsumables, positionGroups } from "./evidence/derive";
import { linkedPair, side } from "./set-fixture";

/**
 * A ref in one file can name an element of another, so what uses, constrains,
 * relates to, embodies or reacts to an element is found across the files of its
 * set, and a workspace read alone sees only itself. The same local ids in both
 * files mean the lookups must hold the two apart.
 */
describe("what uses an element of another file", () => {
	const { a, b, links } = linkedPair();

	it("finds the attribute of another file that is typed by a value object", () => {
		expect(usagesOf(b.ws, b.money)).toContain(links.byValue);
		// a's own Money is not what that attribute is typed by.
		expect(usagesOf(a.ws, a.money)).not.toContain(links.byValue);
		expect(usagesOf(a.ws, a.money)).not.toContain(links.fiat);
	});

	it("finds the rule of another file that constrains an attribute, and not the same rule for the same ref in its own file", () => {
		// a's Balanced constrains b's Id, an attribute of b's root entity.
		expect(invariantsNaming(b.ws, b.root)).toEqual([a.balanced]);
		// a's own root has the same local ref and is not what that rule names.
		expect(invariantsNaming(a.ws, a.root)).toEqual([]);
	});

	it("finds the relation of another file that targets an entity", () => {
		const incoming = relationsNaming(b.ws, b.root);
		expect(incoming.map((r) => r.source)).toContain(a.line);
		expect(relationsNaming(a.ws, a.root).map((r) => r.source)).not.toContain(
			a.line,
		);
	});

	it("finds the term of another file that an entity embodies", () => {
		expect(termsEmbodying(b.ws, b.root)).toContain(links.foreignTerm);
		expect(termsEmbodying(a.ws, a.root)).not.toContain(links.foreignTerm);
	});

	it("lists the policies, processes, consumables and terms of every file of the set, each file's in its own order", () => {
		const policies = [...policiesOf(a.ws)];
		expect(policies).toEqual([a.react, b.react]);
		expect([...processesOf(b.ws)]).toEqual([a.settle, b.settle]);
		expect([...consumablesOf(a.ws)].filter((c) => c.name === "Post")).toEqual([
			a.post,
			b.post,
		]);
		expect([...termsOf(b.ws)].filter((t) => t.name === "Ledger")).toEqual([
			a.term,
			b.term,
		]);
	});

	it("reads a workspace alone as only itself", () => {
		const alone = new Workspace("Alone", { description: "", version: "1" });
		const sub = alone
			.addDomain("D", { description: "" })
			.addSubdomain("S", { type: "core", description: "" });
		const bc = sub.addBoundedcontext("Only", { description: "" });
		const term = bc.addTerm("Word", { definition: "x" });
		expect([...termsOf(alone)]).toEqual([term]);
		expect([...policiesOf(alone)]).toEqual([]);
	});
});

describe("a context's position across the files", () => {
	const { a, b } = linkedPair();

	it("counts the relationships that involve it though they are written in another file", () => {
		const scopeRelationships = [...a.ws.relationships, ...b.ws.relationships];
		// b's Ledger is the upstream of a's Ledger in a relationship a declares.
		const involving = scopeRelationships.filter(
			(r) => r.source === b.ledger || r.target === b.ledger,
		);
		expect(involving.length).toBeGreaterThan(0);
		expect(involving.some((r) => a.ws.relationships.includes(r))).toBe(true);
		const rows = positionGroups(b.ledger, scopeRelationships).flatMap(
			(g) => g.rows,
		);
		expect(rows.map((r) => r.relationship)).toEqual(
			expect.arrayContaining(involving),
		);
		// Read only from b's own file, that position would be missing them.
		const own = positionGroups(b.ledger, b.ws.relationships).flatMap(
			(g) => g.rows,
		);
		expect(own.length).toBeLessThan(rows.length);
	});

	it("finds the consumptions that cross a relationship from whichever file writes them", () => {
		const down = [...a.ws.relationships].find(
			(r) => r.source === a.ledger && r.target === b.ledger,
		);
		expect(down).toBeDefined();
		const crossings = crossingConsumables(down as never, b.ws);
		// a's Account consumes b's Post across that pair.
		expect(crossings.map((c) => c.consumable)).toContain(b.post);
		expect(crossings.every((c) => c.consumable !== a.post)).toBe(true);
	});

	it("keeps two workspaces of one local shape apart", () => {
		const one = side("One");
		const two = side("Two");
		expect(one.ledger.ref).toBe(two.ledger.ref);
	});
});
