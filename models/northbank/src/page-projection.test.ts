import { describe, expect, it } from "vitest";
import { loadMonolith, loadSet, readGenerated } from "./equivalence.support.ts";
import { contextPage } from "./page-projection.ts";

/*
 * The page of each of the 19 contexts says the same thing in the set as in the
 * monolith: same fields, same listed order, except the one list whose order the
 * split moves. This is the part of the page proof that needs no reader host;
 * rendering a set in the pages package, the extension and the viewer is proved
 * there, later.
 */

const monolith = loadMonolith();
const set = loadSet(readGenerated());
const inSet = (id: string) => {
	const found = set.workspaces
		.flatMap((w) => [...w.boundedcontexts.values()])
		.find((bc) => bc.id === id);
	if (!found) throw new Error(`no context ${id} in the set`);
	return found;
};

/**
 * The strategic position table lists a context's relationships in the order
 * the context map holds them, and the map holds them in the order the files
 * list theirs: by declaring file, not in the monolith's single list. The eight
 * contexts below are those where the same rows come in another order.
 */
const POSITION_ORDER_MOVES = [
	"sanctions_screening",
	"accounts",
	"ledger",
	"scheme_gateway",
	"cards",
	"lending",
	"credit_decisioning",
	"fraud",
];

describe("the page of each context, set against monolith", () => {
	it("says the same in every field and every listed order, nineteen contexts, but the order of the position rows", () => {
		const moved: string[] = [];
		for (const [id, before] of monolith.boundedcontexts) {
			const a = contextPage(before);
			const b = contextPage(inSet(id));
			const { position: positionA, ...restA } = a;
			const { position: positionB, ...restB } = b;
			expect(restB, id).toEqual(restA);
			expect([...positionB].sort(), id).toEqual([...positionA].sort());
			if (JSON.stringify(positionA) !== JSON.stringify(positionB))
				moved.push(id);
		}
		expect(moved).toHaveLength(8);
		expect(moved).toEqual(POSITION_ORDER_MOVES);
	});

	it("covers every kind of page content the context page reads", () => {
		const pages = [...monolith.boundedcontexts.values()].map(contextPage);
		const total = (pick: (p: ReturnType<typeof contextPage>) => number) =>
			pages.reduce((n, p) => n + pick(p), 0);
		expect(pages).toHaveLength(19);
		expect(total((p) => p.aggregates.length)).toBe(16);
		expect(total((p) => p.services.length)).toBe(19);
		expect(total((p) => p.valueObjects.length)).toBe(35);
		expect(total((p) => p.schemas.length)).toBe(36);
		expect(total((p) => p.policies.length)).toBe(16);
		expect(total((p) => p.processes.length)).toBe(2);
		expect(total((p) => p.glossary.length)).toBe(31);
		expect(
			total((p) => p.valueObjects.reduce((n, v) => n + v.usedBy.length, 0)),
		).toBeGreaterThan(40);
	});
});
