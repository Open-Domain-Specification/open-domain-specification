import { describe, expect, it } from "vitest";
import { PATTERNS, patternByAbbreviation } from "./patterns";
import type {
	ContextRelationshipType,
	DownstreamRole,
	UpstreamRole,
} from "./schema";

// Listed by hand so the test fails when a union gains a member: the literal
// arrays are checked against the unions by the compiler, and against PATTERNS
// by the assertions below.
const RELATIONSHIP_TYPES: ContextRelationshipType[] = [
	"upstream-downstream",
	"customer-supplier",
	"partnership",
	"shared-kernel",
	"separate-ways",
];
const UPSTREAM_ROLES: UpstreamRole[] = [
	"open-host-service",
	"published-language",
];
const DOWNSTREAM_ROLES: DownstreamRole[] = [
	"conformist",
	"anti-corruption-layer",
];

const CATEGORIES = [
	["relationship", RELATIONSHIP_TYPES],
	["upstream-role", UPSTREAM_ROLES],
	["downstream-role", DOWNSTREAM_ROLES],
] as const;

describe("PATTERNS", () => {
	it("has an entry for every relationship type and role, and nothing else", () => {
		const members = [
			...RELATIONSHIP_TYPES,
			...UPSTREAM_ROLES,
			...DOWNSTREAM_ROLES,
		];
		expect(Object.keys(PATTERNS).sort()).toEqual([...members].sort());
	});

	it.each(CATEGORIES)(
		"files every %s under that category",
		(category, keys) => {
			for (const key of keys) expect(PATTERNS[key].category).toBe(category);
		},
	);

	it("gives every pattern a unique abbreviation", () => {
		const marks = Object.values(PATTERNS).map((p) => p.abbreviation);
		expect(new Set(marks).size).toBe(marks.length);
	});

	it("draws the marks the diagrams already use", () => {
		expect(
			Object.values(PATTERNS)
				.map((p) => p.abbreviation)
				.sort(),
		).toEqual(["ACL", "C/S", "CF", "OHS", "P", "PL", "SK", "SW", "U/D"]);
	});

	it("gives every pattern a name, a summary, a nature and trade-offs", () => {
		for (const [key, pattern] of Object.entries(PATTERNS)) {
			expect(pattern.name, key).toBeTruthy();
			expect(pattern.summary, key).toBeTruthy();
			expect(pattern.architecturalNature, key).toBeTruthy();
			expect(pattern.tradeOffs.length, key).toBeGreaterThan(0);
			for (const tradeOff of pattern.tradeOffs)
				expect(tradeOff, key).toBeTruthy();
		}
	});
});

describe("patternByAbbreviation", () => {
	it("finds the pattern behind a mark", () => {
		expect(patternByAbbreviation("ACL")).toBe(
			PATTERNS["anti-corruption-layer"],
		);
	});

	it("returns undefined for an unknown mark", () => {
		expect(patternByAbbreviation("XX")).toBeUndefined();
	});
});
