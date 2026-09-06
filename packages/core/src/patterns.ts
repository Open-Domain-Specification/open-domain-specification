import type {
	ContextRelationshipType,
	DownstreamRole,
	UpstreamRole,
} from "./schema";

/**
 * What a strategic pattern is, in the words every surface must use: the
 * diagram legend, the hover summaries, the generated documentation, the
 * documentation site and the authoring skill all read this one record, so an
 * agent explains a pattern in the same words the UI shows.
 */
export interface PatternNature {
	/** The pattern's full name, as the legend and prose spell it. */
	name: string;
	/** The mark a diagram draws for it, e.g. `OHS`. Unique across the table. */
	abbreviation: string;
	/**
	 * Where the pattern applies: a relationship between two contexts, or the
	 * role one side plays on that relationship.
	 */
	category: "relationship" | "upstream-role" | "downstream-role";
	/** One line, for a tooltip or a footnote. */
	summary: string;
	/** What the pattern means architecturally, in a sentence or two. */
	architecturalNature: string;
	/** What it buys and what it costs. */
	tradeOffs: string[];
}

/** Every strategic pattern the model can name, keyed by its schema value. */
export const PATTERNS: Record<
	ContextRelationshipType | UpstreamRole | DownstreamRole,
	PatternNature
> = {
	"open-host-service": {
		name: "Open Host Service",
		abbreviation: "OHS",
		category: "upstream-role",
		summary:
			"A public, stable protocol or API provided by an upstream context.",
		architecturalNature:
			"The upstream context commits to maintaining a standardized, backward-compatible interface so multiple downstream subsystems can integrate without bespoke integration logic.",
		tradeOffs: [
			"Reduces coupling across multiple consumers",
			"Increases upstream maintenance overhead and versioning obligations",
		],
	},
	"anti-corruption-layer": {
		name: "Anti-Corruption Layer",
		abbreviation: "ACL",
		category: "downstream-role",
		summary:
			"A translating boundary isolating a downstream model from external concepts.",
		architecturalNature:
			"A translating mechanism (adapters, facades, mappers) that keeps foreign domain concepts, schema changes, or vendor anomalies from leaking into the downstream model.",
		tradeOffs: [
			"Maximum isolation and autonomy for the downstream context",
			"Cost of maintaining translation logic and data mappings",
		],
	},
	conformist: {
		name: "Conformist",
		abbreviation: "CF",
		category: "downstream-role",
		summary: "Downstream adopts the upstream domain model without translation.",
		architecturalNature:
			"The downstream team accepts the upstream model as-is, dropping translation layers when the upstream model fits well or translation overhead is unjustified.",
		tradeOffs: [
			"No translation and a simpler codebase",
			"Exposed to breaking upstream schema changes",
		],
	},
	"published-language": {
		name: "Published Language",
		abbreviation: "PL",
		category: "upstream-role",
		summary: "A well-documented shared interchange format.",
		architecturalNature:
			"An explicit schema standard (JSON Schema, Protobuf, an industry XML) that expresses domain operations and events independently of either context's internal representation.",
		tradeOffs: [
			"Enables polyglot integrations and widespread consumption",
			"Requires governance over schema evolution",
		],
	},
	"upstream-downstream": {
		name: "Upstream/Downstream",
		abbreviation: "U/D",
		category: "relationship",
		summary:
			"One context depends on another; the upstream does not plan around the downstream.",
		architecturalNature:
			"A directed dependency with no customer commitment: the upstream evolves on its own schedule and the downstream adapts through its roles.",
		tradeOffs: [
			"Upstream keeps full autonomy",
			"Downstream carries the integration risk",
		],
	},
	"customer-supplier": {
		name: "Customer/Supplier",
		abbreviation: "C/S",
		category: "relationship",
		summary: "Upstream plans for and prioritizes downstream requirements.",
		architecturalNature:
			"An asymmetric relationship where downstream needs act as customer requirements and upstream delivery commitments factor in downstream deadlines.",
		tradeOffs: [
			"Predictable alignment between collaborating teams",
			"Upstream velocity can be constrained by downstream dependencies",
		],
	},
	"shared-kernel": {
		name: "Shared Kernel",
		abbreviation: "SK",
		category: "relationship",
		summary:
			"A shared subset of domain model and code, co-owned by both teams.",
		architecturalNature:
			"A strictly bounded shared library, schema, or database subset. Neither team alters the kernel without joint consultation and continuous test verification.",
		tradeOffs: [
			"Prevents duplicate modeling and translation costs",
			"High coordination friction; degrades autonomy if it grows beyond a small subset",
		],
	},
	partnership: {
		name: "Partnership",
		abbreviation: "P",
		category: "relationship",
		summary:
			"Mutual co-operation where teams coordinate development and releases.",
		architecturalNature:
			"Two contexts succeed or fail together. Features spanning both are planned, co-designed, and released in synchronized cycles.",
		tradeOffs: [
			"Tight strategic cohesion across organizational boundaries",
			"Requires close communication and joint release cadences",
		],
	},
	"separate-ways": {
		name: "Separate Ways",
		abbreviation: "SW",
		category: "relationship",
		summary:
			"A deliberate decision to forego integration and develop independently.",
		architecturalNature:
			"Both contexts solve their requirements without technical links, accepting possible domain overlap to keep complete operational independence.",
		tradeOffs: [
			"Maximum operational autonomy with no cross-team dependencies",
			"Possible duplication of data and business logic",
		],
	},
};

/** The pattern behind a mark such as `OHS`, or undefined for an unknown mark. */
export const patternByAbbreviation = (
	abbreviation: string,
): PatternNature | undefined =>
	Object.values(PATTERNS).find((p) => p.abbreviation === abbreviation);
