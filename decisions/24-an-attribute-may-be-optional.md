# 24. An attribute may be optional

Date: 2026-09-07

## Status

Accepted

## Current position (2026-09-10)

Stable. `optional` on attributes, absent meaning required, `identity-not-optional` as an error, and nothing else reading the flag; no amendment moves these. The note of 2026-09-08 (card 89) fixed what `attribute-relation-coherence` reads: presence is not size, so a required scalar pairs with `1`, an optional scalar with `0..1`, and a list with `*` or `1..*` whatever its presence; the first rule's equation of required with non-empty no longer holds. Decision 13's note of 2026-09-10 (card 119) applies the flag to a flat discriminated object: attributes that apply only to some kinds are marked optional. Decision 22 offers `specialises` where the flag would otherwise be explaining a hierarchy.

## Context

Decision 15 deferred an optional flag on attributes "until a reference model needs it". The petstore reference model is built from the Swagger Petstore, whose `Pet.tag` is optional in the source contract, and the model has been saying otherwise since the first commit. A reader of an attribute table cannot tell a field that is always present from one that is sometimes absent, and the skill's interview cannot ask. The condition for reopening is met by the oldest model in the repository.

## Decision

- `AttributeSchema.optional?: boolean`. Absent means required, which is the common case and stays unwritten.
- An identity attribute is never optional; `identity-not-optional` (error) says so, because an identity that may be missing is not an identity.
- Nothing else reads the flag. The type stays the author's text (decision 15); optionality is the one fact about an attribute that the model states rather than the author's prose.

## Consequences

- One optional field in the schema, the workspace model, the DSL (`addAttribute(name, { optional: true })`), `toSchema`/`fromSchema`, and the regenerated JSON schema; `feat!` because the reference models change.
- Attribute tables on pages and in the generated docs mark an optional attribute; the skill's interview asks "which of these are always present?" once per entity, value object and schema.
- Reference models set the flag where the source contract or the discovery notes say so, and nowhere else.

## Note (2026-09-08)

Presence is not size. `optional` says whether the attribute is there; a relation's cardinality says how many the list may hold, and a required list may hold none. The coherence rule therefore pairs a required scalar with `1`, an optional scalar with `0..1`, and a list with `*` or `1..*` regardless of presence (card 89). The first rule equated required with non-empty and made petstore misstate its own contract.
