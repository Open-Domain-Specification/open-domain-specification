import { readFileSync } from "node:fs";
import { join } from "node:path";
import { PATTERNS } from "@open-domain-specification/core";
import { describe, expect, it } from "vitest";

/**
 * The strategic design page is the one place the trade-offs appear in full.
 * It is written by hand, so this test is what stops it drifting from core's
 * `PATTERNS`: every pattern must be named, marked, summarised and costed
 * there in exactly core's words.
 */
const page = readFileSync(
	join(__dirname, "../docs/2-ddd/3-strategic-design.md"),
	"utf8",
);

describe("the strategic design page's relationship patterns section", () => {
	const section = page.split("### Relationship Patterns")[1] ?? "";

	it("has the section at all", () => {
		expect(section).not.toBe("");
	});

	it.each(Object.entries(PATTERNS))(
		"names %s with its mark, summary, nature and trade-offs",
		(_key, pattern) => {
			expect(section).toContain(pattern.name);
			expect(section).toContain(`\`${pattern.abbreviation}\``);
			expect(section).toContain(pattern.summary);
			expect(section).toContain(pattern.architecturalNature);
			for (const tradeOff of pattern.tradeOffs)
				expect(section).toContain(tradeOff);
		},
	);
});
