import { readFileSync } from "node:fs";
import { join } from "node:path";
import { RULE_CATALOG } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";

/**
 * The validation page's rule table is written by hand, so this test is what
 * stops its rule ids drifting from core's `RULE_CATALOG` (card 79): a rule
 * added, removed or renamed in core must be named here too.
 */
const page = readFileSync(
	join(__dirname, "../docs/3-core/4-validation.md"),
	"utf8",
);

const tableRuleIds = [...page.matchAll(/^\| `([a-z-]+)` \|/gm)].map(
	(match) => match[1],
);

describe("the validation page's rule table", () => {
	it("names every rule id the catalogue exports, and no others", () => {
		const catalogIds = RULE_CATALOG.map((rule) => rule.rule).sort();
		const docIds = [...tableRuleIds].sort();

		const missing = catalogIds.filter((id) => !docIds.includes(id));
		const extra = docIds.filter((id) => !catalogIds.includes(id));

		expect(
			missing,
			`table is missing rule ids: ${missing.join(", ") || "none"}`,
		).toEqual([]);
		expect(
			extra,
			`table has extra rule ids not in the catalogue: ${extra.join(", ") || "none"}`,
		).toEqual([]);
	});
});
