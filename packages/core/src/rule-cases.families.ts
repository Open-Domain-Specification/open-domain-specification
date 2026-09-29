/**
 * Which family every validator rule belongs to, and how far its pair of
 * cases has got (issue #57, card 138).
 *
 * A rule has two cases: the smallest model that trips it, and the nearest model
 * that must stay clean. The families are the slices the work is delivered in;
 * a slice lands when every rule in it has both cases, written in a
 * `rule-cases.<family>.test.ts` file beside this one. This file is the
 * tracker: `rule-cases.test.ts` fails when the catalogue gains or loses a rule
 * this map does not know, and when a rule marked `covered` has no case, so
 * nothing is dropped silently.
 */

export type RuleFamily =
	| "boundary-and-borrowing"
	| "callers-and-answer-routing"
	| "file-and-loading"
	| "aggregates-and-identity"
	| "value-objects-and-specialisation"
	| "invariants"
	| "relationships-and-roles"
	| "processes-and-policies"
	| "events-and-raising"
	| "documentation-and-strategy";

/** `covered` once the rule has both cases in a family's test file. */
export type RuleStatus = "covered" | "todo";

export type FamilyEntry = { family: RuleFamily; status: RuleStatus };

const covered = (family: RuleFamily): FamilyEntry => ({
	family,
	status: "covered",
});
const todo = (family: RuleFamily): FamilyEntry => ({ family, status: "todo" });

export const RULE_FAMILIES: Record<string, FamilyEntry> = {
	// Slice 1: what crosses a boundary, and who may hold what of a neighbour.
	"cross-context-relation": covered("boundary-and-borrowing"),
	"identifies-entity": covered("boundary-and-borrowing"),
	"specialisation-in-boundary": covered("boundary-and-borrowing"),
	"valueobject-context": covered("boundary-and-borrowing"),
	"schema-context": covered("boundary-and-borrowing"),
	"separate-ways": covered("boundary-and-borrowing"),
	"internal-consumable": covered("boundary-and-borrowing"),
	"aggregate-not-public": covered("boundary-and-borrowing"),
	"aggregate-consumes-inside": covered("boundary-and-borrowing"),
	"domain-service-consumes-inside": covered("boundary-and-borrowing"),
	"domain-service-internal": covered("boundary-and-borrowing"),
	"external-is-boundary": covered("boundary-and-borrowing"),
	"boundary-only-is-boundary": covered("boundary-and-borrowing"),

	// Slice 1: who makes a call, who hears an answer, who takes a fact in.
	"consumption-once": covered("callers-and-answer-routing"),
	"consumption-by-resolves": covered("callers-and-answer-routing"),
	"consumption-by-operation": covered("callers-and-answer-routing"),
	"consumption-by-reactor": covered("callers-and-answer-routing"),
	"consumption-by-required": covered("callers-and-answer-routing"),
	"subscription-consumed": covered("callers-and-answer-routing"),
	"subscription-backed": covered("callers-and-answer-routing"),
	"consumable-kind": covered("callers-and-answer-routing"),
	"role-coherence": covered("callers-and-answer-routing"),
	"reaction-cycle": covered("callers-and-answer-routing"),

	// The file itself: loading, versions, refs, unknown fields.
	"ods-version": todo("file-and-loading"),
	"unresolved-ref": todo("file-and-loading"),
	"unknown-field": todo("file-and-loading"),

	// Aggregates, their entities and their identities.
	"aggregate-root": covered("aggregates-and-identity"),
	"cross-aggregate-reference": covered("aggregates-and-identity"),
	"root-identity": covered("aggregates-and-identity"),
	"entity-identity": covered("aggregates-and-identity"),
	"identity-not-optional": covered("aggregates-and-identity"),
	"aggregate-tree": covered("aggregates-and-identity"),
	"specialisation-cycle": covered("aggregates-and-identity"),
	"specialisation-not-root": covered("aggregates-and-identity"),
	"specialisation-redeclares": covered("aggregates-and-identity"),

	// Value objects, attributes and relations between them.
	"value-object-shape": todo("value-objects-and-specialisation"),
	"attribute-relation-coherence": todo("value-objects-and-specialisation"),
	"relation-for-resolves": todo("value-objects-and-specialisation"),
	"attribute-one-shape": todo("value-objects-and-specialisation"),
	"returns-on-operation": todo("value-objects-and-specialisation"),
	"rejects-on-operation": todo("value-objects-and-specialisation"),

	// Invariants and the contracts an operation is held to.
	"invariant-in-value-object": covered("invariants"),
	"invariant-in-aggregate": covered("invariants"),
	"invariant-in-context": covered("invariants"),
	"context-invariant-is-checked": covered("invariants"),
	"precondition-names-operation": covered("invariants"),
	"postcondition-names-operation": covered("invariants"),

	// Context relationships, their roles and what backs them.
	"relationship-roles-backed": covered("relationships-and-roles"),
	"consumption-agreement": covered("relationships-and-roles"),
	"relationship-declared": covered("relationships-and-roles"),
	"relationship-duplicate": covered("relationships-and-roles"),
	"relationship-cycle": covered("relationships-and-roles"),
	"partnership-backed": covered("relationships-and-roles"),
	"shared-kernel-backed": covered("relationships-and-roles"),
	"conformist-backed": covered("relationships-and-roles"),
	"mud-needs-acl": covered("relationships-and-roles"),

	// Policies and processes: where they live and what starts and ends them.
	"process-in-context": covered("processes-and-policies"),
	"process-has-ends": covered("processes-and-policies"),
	"process-starts": covered("processes-and-policies"),
	"policy-in-context": covered("processes-and-policies"),
	"policy-complete": covered("processes-and-policies"),

	// Events: who raises them, and what raising one may say.
	"raises-in-context": covered("events-and-raising"),
	"raises-in-aggregate": covered("events-and-raising"),
	"raises-restated": covered("events-and-raising"),
	"rejection-raised": covered("events-and-raising"),
	"event-unraised": covered("events-and-raising"),

	// Documentation, the glossary and the strategic map.
	"term-in-context": todo("documentation-and-strategy"),
	"context-serves-subdomain": todo("documentation-and-strategy"),
	"comments-required": todo("documentation-and-strategy"),
	"disposition-needs-comment": todo("documentation-and-strategy"),
};
