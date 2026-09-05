# 25. An operation names what it rejects with

Date: 2026-09-07

## Status

Accepted

## Context

Decision 13 gave operations `returns` and said synchronous error shapes are not modelled: failures that matter to the domain are events. That is right for something that happened and wrong for something that did not. A payment that is declined, an order that fails validation, a transfer over the daily limit: nothing happened, the caller is told why in a shape the contract names, and the model had nowhere to put it. Every review run since raised it, and the answer "model it as an event" makes an author invent an event for a non-event.

## Decision

- `ConsumableSchema.rejects?: { $ref: string }[]`, valid only when `type` is `operation`; `rejects-on-operation` (error) refuses it on an event.
- Each ref names a `DataSchema` of the provider's context, covered by `schema-context` exactly as `schema` and `returns` are.
- A rejection is the shape an operation answers with when it refuses; it is not an event, because nothing happened, and it is not a transport error, which stays outside the model. Absent means the operation either always succeeds or refuses without a domain-meaningful shape, which is honest for most commands.

## Consequences

- One optional field in the schema, the workspace model, the DSL (`provides(..., { rejects: [...] })`), `toSchema`/`fromSchema`, and the regenerated JSON schema; `feat!` because the reference models change.
- The consumable page gains a "Rejects with" table beside "Returns"; the generated docs print it; the skill's interview asks, for operations, "and when it says no, what does it say?".
- Decision 13's line "synchronous error shapes are not modelled" is superseded by this record.
