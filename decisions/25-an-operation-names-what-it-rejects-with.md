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

## Note (2026-09-08)

A rejection is something a process can wait on (decision 23, second amendment), which is what makes it usable: the process that called `AuthorisePayment` reacts to `PaymentDeclined` as the answer it was, not as an event the world was told about.

## Amendment (2026-09-10)

A rejection is keyed by its shape, and a contract that refuses with one shape and a reason code, an acquirer's response code 05 against 51, gave a process one branch whatever the code said; the only faithful alternative, one schema per reason, misstates the contract the way decision 13's `many` amendment refused for lists. A rejection may name its `reasons`, the enumerated outcomes the contract states, and each is an answer a process may hear, alongside the shape-level answer that hears them all. A reason is a named outcome of the contract, not a condition on data, which decision 15 still refuses (card 114, architect's ninth round).
