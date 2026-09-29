import { describe, expect, it } from "vitest";
import { RULE_FAMILIES } from "./rule-cases.families";
import { RULE_CATALOG } from "./validate";

/**
 * The tracker for issue #57 is only worth reading if it lists every rule, so
 * the catalogue and the map may not drift apart: a rule added to the validator
 * fails here until somebody says which family it is in, and a rule removed
 * fails until the map forgets it.
 */
describe("rule cases: the family map", () => {
	it("names a family for every rule in the catalogue, and no other", () => {
		expect(Object.keys(RULE_FAMILIES).sort()).toEqual(
			RULE_CATALOG.map((r) => r.rule).sort(),
		);
	});
});
