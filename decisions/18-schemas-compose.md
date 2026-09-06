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

## Amendment (2026-09-10)

"Composition is enough for payloads" gave no reason for refusing unions, and the debate on reopening them supplied both the reason and the condition. The reasons: a type is the author's text and already says `'a' | 'b'`; a structured either-or on an answer already exists as `returns` plus `rejects` plus `reasons`; kinds of a value are `specialises`; and a union is a new kind of schema, not a bit on a ref like `many`, that composition reach, `schema-context`, the pages and the doc would all have to learn. The condition for the first tier, an operation answering with one of several shapes: a reference model, or card 117's, has from its interview or source contract an operation answering with two or more shapes none of which is a refusal, and `<op>/returns/<schema>` fits the answer grammar with no new class in `Answer` or the walk; then `returns` becomes a list the way `rejects` is. A referral (the scorecard hands the case to a person) is such a case, because a rejection says nothing happened and a referral is not that; no model has one yet. If the first case turns out to be a flat discriminated object, the wrapper is right and decision 13 says so. Attribute-level unions stay on decision 15's own condition, more than two targets on one attribute, transposed to payloads.
