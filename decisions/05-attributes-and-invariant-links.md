---
status: Accepted
date: 2026-09-02
---
# Decision 05 — Attributes on entities and value objects, invariants linked to what they constrain

## Current position (2026-09-10)

`AttributeSchema` and `InvariantSchema.constrains` exist as decided and have only grown. An attribute may also carry `identifies` (decision 14, card 54), `schema` as an alternative to `valueobject`, the two mutually exclusive under `attribute-one-shape` (decision 18), and `optional` (decision 24); an identity attribute is never optional (`identity-not-optional`, decision 24). `type` stays the author's text, with the one convention that a trailing `[]` means many (decision 15, "Attribute types are free text"). A value object's own attributes may not carry `identity: true` (`value-object-shape`, decision 07's note of 2026-09-08). `valueobject` reaches another context's value only across a shared kernel or a conformist relationship (`valueobject-context`, decision 16's amendment of 2026-09-08, card 92); value objects themselves now belong to the context, not the aggregate (decision 16).

`constrains` may also name an operation of the invariant's aggregate or of any service of its context (decision 19, cards 50, 90 and 91) and, flagged `precondition` or `postcondition`, attributes of the schemas around that operation (decision 19, cards 97 to 124). An invariant may belong to a context as well as an aggregate (decision 27), and a value object's invariant reaches its own and inherited attributes and what they compose (decision 27, card 113).

No decision bullet is contradicted; each has been widened by the records named.

## Context

Entities and value objects carried only a name, description and relations.
Value objects in particular are defined by their attributes. Invariants were
free text with no link to the elements they constrain. See board cards 08
and 09.

## Decision

- `AttributeSchema { name, type, description, identity?, valueobject?: { $ref } }`
  where `type` is a free-form string (e.g. `string`, `Money`, `Date`) and
  `valueobject` optionally points at the value object that models the type.
- `EntitySchema.attributes` and `ValueObjectSchema.attributes` are keyed
  records of attributes. `identity: true` marks the attribute(s) that
  identify an entity.
- `InvariantSchema.constrains` is an optional list of `{ $ref }` pointing at
  entities, value objects or attributes
  (`.../entities/<id>/attributes/<id>`).

## Consequences

- Additive schema change.
- Docs and UI render attribute tables and list invariants next to the
  elements they constrain.
