---
status: Accepted
date: 2026-09-02
---
# Decision 05 — Attributes on entities and value objects, invariants linked to what they constrain

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
