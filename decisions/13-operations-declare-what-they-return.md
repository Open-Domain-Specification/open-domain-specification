---
status: Proposed
date: 2026-09-06
---
# Decision 13 — Operations declare what they return

## Context

A consumable of type `operation` carries one payload, `schema`, and `raises` may only name events. A query such as petstore's `GetPetSummary` therefore models its input and has nowhere to say what comes back; its description promises an id, name and status while its schema is the id parameter. Queries are half of any system, and the reference model contradicts itself. Raised in an external review of the metamodel; confirmed against `packages/core/src/schema.ts` and `models/petstore/src/workspace.ts`.

## Decision

- `ConsumableSchema` gains `returns?: { $ref: string }`, valid only when `type` is `operation`; a rule rejects it on an event.
- `returns` points at a `DataSchema` and the `schema-context` rule covers it exactly as it covers `schema`: the schema belongs to the provider's context.
- `schema` keeps its meaning: the payload the caller sends. Absent `returns` means the operation returns nothing worth naming, which is honest for commands.
- Synchronous error shapes are not modelled. Failures that matter to the domain are events, as today; transport errors are outside the model.

## Consequences

- One optional field in the schema, the workspace model, the DSL (`provides(..., { returns })`) and the regenerated JSON schema. A breaking `feat!` since the reference models change.
- Pages: the consumable page gains a "Returns" row and a second attribute table, shown only when set; the provides table gains no column.
- Doc generator and skill follow; the interview's "what information travels with that request?" gains the follow-up "and what comes back?" for operations.
- Read models need no construct of their own: a service providing a query with `returns` says it.
