---
status: Proposed
date: 2026-09-06
---
# Decision 18 — Schemas compose

## Current position (2026-09-10)

Status is Proposed. `AttributeSchema.schema` composes schemas, `attribute-one-shape` keeps `valueobject` and `schema` exclusive, and collections stay in the type string; stable. Composition is read by other rules: a precondition or postcondition reaches a field of any schema the request or answer composes (decision 19, card 99), and `schema-context` covers a nested schema as it covers a consumable's. The decision's "same context (or a shared-kernel partner's)" is narrower than what holds: a conformist downstream may also nest a conformed-to upstream's schema, per decision 16's amendment of 2026-09-08 (card 81) and verified in `packages/core/src/validate.ts` (`schemaContext`), which admits a shared kernel or a conformist and, for attributes, never an anti-corruption layer.

No inheritance and no unions still holds, now with reasons and a condition (amendment of 2026-09-10): kinds of a value are `specialises` (decision 22), a structured either-or on an answer is `returns` plus `rejects` plus `reasons` (decisions 13 and 25), and `returns` becomes a list the day a reference model's operation answers with two or more shapes none of which is a refusal and a process waits on that answer. Card 117's waitlisted-not-booked case was a second successful outcome with no caller waiting, so it is the `raises` list with no `returns`; the condition is unmet (note after card 117), and a rejection shape the operation also raises as an event draws a warning (card 123). Attribute-level unions stay on decision 15's condition. A flat discriminated object is a faithful wire shape (decision 13, card 119).

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

## Note (2026-09-10, after card 117)

The blind clinic model produced a second outcome that is not a refusal, a patient waitlisted instead of booked, and carried it under `rejects` for want of a shape. Both debate parties judged it from the model: it is a second successful outcome, so `rejects` misstates it, and nothing waits on the answer; the operation is issued by a policy and already raises both events, and the record's form for one-of-two-things-happened with no caller waiting is the `raises` list with no `returns`. The author picked the wrong of two shapes the record has. The condition stands unchanged: it is met the day a process waits on such an answer. A rejection shape that the same operation also raises as an event is a model telling on itself, and a warning says so (card 123).
