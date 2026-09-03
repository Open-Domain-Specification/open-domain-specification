import { describe, expect, it } from "vitest";
import {
	type NarratableRelationship,
	type NarrativeContext,
	narrativeText,
	relationshipNarrative,
} from "./narrative";
import type {
	ContextRelationshipType,
	DirectedRelationshipType,
	DownstreamRole,
	SymmetricRelationshipType,
	UpstreamRole,
} from "./schema";

/**
 * The generated sentence is the one place four surfaces agree on wording, so
 * the wording itself is what these tests pin: every clause of RFC-001 section
 * 5 spelled out as a literal, and the section 6 walkthrough asserted verbatim.
 */

const CATALOG: NarrativeContext = {
	ref: "#/boundedcontexts/catalog_bc",
	name: "Catalog BC",
};
const SALES: NarrativeContext = {
	ref: "#/boundedcontexts/sales_bc",
	name: "Sales BC",
};

const directed = (
	type: DirectedRelationshipType,
	upstreamRoles: UpstreamRole[],
	downstreamRoles: DownstreamRole[],
): NarratableRelationship => ({
	type,
	source: CATALOG,
	target: SALES,
	upstreamRoles,
	downstreamRoles,
});

const sentence = (r: NarratableRelationship, viewpoint: NarrativeContext) =>
	narrativeText(relationshipNarrative(r, viewpoint));

/** Every upstream role combination, with the phrase each one reads as. */
const UPSTREAM: {
	roles: UpstreamRole[];
	exposing: string;
	consuming: string;
}[] = [
	{ roles: [], exposing: "", consuming: "" },
	{
		roles: ["open-host-service"],
		exposing: ", exposing an Open Host Service",
		consuming: ", consuming its Open Host Service",
	},
	{
		roles: ["published-language"],
		exposing: ", exposing a Published Language",
		consuming: ", consuming its Published Language",
	},
	{
		roles: ["open-host-service", "published-language"],
		exposing: ", exposing an Open Host Service and a Published Language",
		consuming: ", consuming its Open Host Service and Published Language",
	},
];

/** Every downstream role combination, with the clause each one reads as. */
const DOWNSTREAM: { roles: DownstreamRole[]; clause: string }[] = [
	{ roles: [], clause: "takes the upstream model as it comes" },
	{
		roles: ["anti-corruption-layer"],
		clause: "protects its model with an Anti-Corruption Layer",
	},
	{ roles: ["conformist"], clause: "conforms directly to the upstream model" },
	{
		roles: ["anti-corruption-layer", "conformist"],
		clause:
			"conforms to the upstream model and protects the rest with an Anti-Corruption Layer",
	},
];

const VERBS: Record<DirectedRelationshipType, string> = {
	"customer-supplier": "acts as an upstream supplier to",
	"upstream-downstream": "is upstream of",
};

const TYPES = Object.keys(VERBS) as DirectedRelationshipType[];

describe("relationshipNarrative, directed", () => {
	for (const type of TYPES)
		for (const up of UPSTREAM)
			for (const down of DOWNSTREAM) {
				const label = `${type} / up [${up.roles}] / down [${down.roles}]`;
				const r = directed(type, up.roles, down.roles);

				it(`reads from the upstream viewpoint: ${label}`, () => {
					expect(sentence(r, CATALOG)).toBe(
						`Catalog BC ${VERBS[type]} Sales BC${up.exposing}, while Sales BC ${down.clause}.`,
					);
				});

				it(`reads from the downstream viewpoint: ${label}`, () => {
					const customer = type === "customer-supplier" ? " as a customer" : "";
					expect(sentence(r, SALES)).toBe(
						`Sales BC depends on Catalog BC${customer}${up.consuming}, and it ${down.clause}.`,
					);
				});
			}
});

describe("relationshipNarrative, symmetric", () => {
	// Neither end leads, so the only difference between the two viewpoints is
	// which participant is the subject.
	const SYMMETRIC: Record<
		SymmetricRelationshipType,
		{ fromCatalog: string; fromSales: string }
	> = {
		"shared-kernel": {
			fromCatalog:
				"Catalog BC shares a Shared Kernel with Sales BC; changes to it need both teams' agreement.",
			fromSales:
				"Sales BC shares a Shared Kernel with Catalog BC; changes to it need both teams' agreement.",
		},
		partnership: {
			fromCatalog:
				"Catalog BC is in a Partnership with Sales BC; the two plan, build and release together.",
			fromSales:
				"Sales BC is in a Partnership with Catalog BC; the two plan, build and release together.",
		},
		"separate-ways": {
			fromCatalog:
				"Catalog BC has gone Separate Ways from Sales BC; there is no technical integration between them.",
			fromSales:
				"Sales BC has gone Separate Ways from Catalog BC; there is no technical integration between them.",
		},
	};

	for (const [type, expected] of Object.entries(SYMMETRIC))
		it(`reads from either end: ${type}`, () => {
			const r: NarratableRelationship = {
				type: type as ContextRelationshipType,
				source: CATALOG,
				target: SALES,
				upstreamRoles: [],
				downstreamRoles: [],
			};
			expect(sentence(r, CATALOG)).toBe(expected.fromCatalog);
			expect(sentence(r, SALES)).toBe(expected.fromSales);
		});
});

describe("relationshipNarrative, the petstore walkthrough", () => {
	// RFC-001 section 6, which is the wording every surface is checked against.
	const r = directed(
		"customer-supplier",
		["open-host-service"],
		["anti-corruption-layer"],
	);

	it("reads from Catalog BC", () => {
		expect(sentence(r, CATALOG)).toBe(
			"Catalog BC acts as an upstream supplier to Sales BC, exposing an Open Host Service, while Sales BC protects its model with an Anti-Corruption Layer.",
		);
	});

	it("reads from Sales BC", () => {
		expect(sentence(r, SALES)).toBe(
			"Sales BC depends on Catalog BC as a customer, consuming its Open Host Service, and it protects its model with an Anti-Corruption Layer.",
		);
	});
});

describe("relationshipNarrative, segments", () => {
	it("names each context once and each pattern once, with the text merged between", () => {
		const r = directed(
			"customer-supplier",
			["open-host-service"],
			["anti-corruption-layer"],
		);
		expect(relationshipNarrative(r, CATALOG)).toEqual([
			{ kind: "context", ref: CATALOG.ref, name: "Catalog BC" },
			{ kind: "text", text: " acts as an upstream supplier to " },
			{ kind: "context", ref: SALES.ref, name: "Sales BC" },
			{ kind: "text", text: ", exposing an " },
			{ kind: "pattern", pattern: "open-host-service" },
			{ kind: "text", text: ", while " },
			{ kind: "context", ref: SALES.ref, name: "Sales BC" },
			{ kind: "text", text: " protects its model with an " },
			{ kind: "pattern", pattern: "anti-corruption-layer" },
			{ kind: "text", text: "." },
		]);
	});

	it("makes the relationship type a pattern segment on a symmetric sentence", () => {
		const r: NarratableRelationship = {
			type: "partnership",
			source: CATALOG,
			target: SALES,
			upstreamRoles: [],
			downstreamRoles: [],
		};
		expect(relationshipNarrative(r, CATALOG)).toContainEqual({
			kind: "pattern",
			pattern: "partnership",
		});
	});
});

describe("relationshipNarrative, implied links", () => {
	// Rule 5: derived from consumptions, so it has no declared type or roles.
	const implied: NarratableRelationship = {
		type: "upstream-downstream",
		source: CATALOG,
		target: SALES,
		upstreamRoles: ["open-host-service"],
		downstreamRoles: ["anti-corruption-layer"],
		implied: true,
	};

	it("drops the roles and says where the link came from, from either end", () => {
		expect(sentence(implied, CATALOG)).toBe(
			"Catalog BC is upstream of Sales BC, while Sales BC takes the upstream model as it comes. Implied by consumptions; no explicit relationship is declared.",
		);
		expect(sentence(implied, SALES)).toBe(
			"Sales BC depends on Catalog BC, and it takes the upstream model as it comes. Implied by consumptions; no explicit relationship is declared.",
		);
	});

	it("uses the plain directed template even when a type was carried over", () => {
		expect(
			sentence({ ...implied, type: "customer-supplier" }, CATALOG),
		).toContain("Catalog BC is upstream of Sales BC");
	});
});
