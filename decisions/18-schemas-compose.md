---
status: Proposed
date: 2026-09-06
---
# Decision 18 — Schemas compose

## Context

A `DataSchema` is a flat dictionary of attributes, and an attribute's only structural type is a value object (`AttributeSchema.valueobject`). A payload with a nested shape (an order with lines, an address inside a customer) cannot be modelled without either flattening it or pointing at a tactical value object, which couples a published language to the domain's internals. Decision 09 chose the value-object bridge deliberately and it stays; what is missing is a schema naming another schema.

## Decision

- `AttributeSchema.schema?: { $ref: string }`: an attribute may be typed by another `DataSchema` of the same context (or a shared-kernel partner's, per decision 16). `valueobject` and `schema` are mutually exclusive on one attribute; a rule says so.
- Collections stay in the type string (`OrderLine[]`), as today; no separate list construct.
- No inheritance, no unions beyond the type string. Composition is enough for payloads.

## Consequences

- One optional field, one rule (`attribute-one-shape`), the `schema-context` rule extended to it, JSON schema regenerated, attribute tables on the schema page link the nested schema, doc generator follows, interview asks "is that a shape of its own?" when an attribute is described as a thing with parts.
