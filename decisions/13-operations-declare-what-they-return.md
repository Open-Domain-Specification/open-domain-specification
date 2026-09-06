---
status: Accepted
date: 2026-09-06
---
# Decision 13 — Operations declare what they return

## Current position (2026-09-10)

Status is Accepted (2026-09-10, after thirteen review rounds; it had read Proposed while its rules were errors the models were pinned to). `returns` exists on operations only, points at a schema of the provider's context under `schema-context`, and `schema` stays the payload the caller sends; these hold. Both `returns` and `schema` carry `many` for a list answer or payload, since the amendment of 2026-09-09 (card 97) and the amendment of 2026-09-10 (card 114). The note of 2026-09-08 that a list is returned in a wrapper schema no longer holds; see the amendment of 2026-09-09. A flat object with a `kind` field is a faithful wire shape; the misstatement refused is a wrapper around what the wire does not carry (note of 2026-09-10, card 119).

The decision bullet that synchronous error shapes are not modelled no longer holds; see decision 25, `rejects` and its `reasons`.

Absent `returns` still means nothing worth naming, and an operation without it still completes: a reactor may wait on `completed` (second amendment of 2026-09-09, card 99), so the note that a returns-less command costs a caller two consumptions is superseded where the caller waits on completion. An asynchronous request with a correlated later reply is the returns-less call plus the events the provider raises (note of 2026-09-10, card 105).

An answer is a trigger a policy or process names by origin, `<op>/returns` (decision 23, card 94), and a postcondition may constrain what an operation returns (decision 19). Whether `returns` ever becomes a list is decision 18's open condition.

## Context

A consumable of type `operation` carries one payload, `schema`, and `raises` may only name events. A query such as petstore's `GetPetSummary` therefore models its input and has nowhere to say what comes back; its description promises an id, name and status while its schema is the id parameter. Queries are half of any system, and the reference model contradicts itself. Raised in an external review of the metamodel; confirmed against `packages/core/src/schema.ts` and `models/petstore/src/workspace.ts`.

## Decision

- `ConsumableSchema` gains `returns?: { $ref: string }`, valid only when `type` is `operation`; a rule rejects it on an event.
- `returns` points at a `DataSchema` and the `schema-context` rule covers it exactly as it covers `schema`: the schema belongs to the provider's context.
- `schema` keeps its meaning: the payload the caller sends. Absent `returns` means the operation returns nothing worth naming, which is honest for commands.
- Synchronous error shapes are not modelled. Failures that matter to the domain are events, as today; transport errors are outside the model. *Superseded on 2026-09-07 by decision 25: an operation names the shapes it rejects with.*

## Consequences

- One optional field in the schema, the workspace model, the DSL (`provides(..., { returns })`) and the regenerated JSON schema. A breaking `feat!` since the reference models change.
- Pages: the consumable page gains a "Returns" row and a second attribute table, shown only when set; the provides table gains no column.
- Doc generator and skill follow; the interview's "what information travels with that request?" gains the follow-up "and what comes back?" for operations.
- Read models need no construct of their own: a service providing a query with `returns` says it.

## Note (2026-09-08)

A query that answers with a list returns an answer schema whose attribute holds the list, `SearchResults { hits: SearchHit[] }`; `returns` names one shape and the shape says it is many. Petstore's `FindPetsByStatus` said it returned one Pet and now returns `Pets` (card 92).

## Amendment (2026-09-09)

The note above answered a list with a wrapper schema, and Codex's review is right that a named collection and an object holding one are different shapes: Swagger's `findByStatus` answers with a root array, and a consumer could not recover that from `Pets { pets: PetSummary[] }`. `returns` gains `many`, the answer is a list of that shape (card 97); a wrapper stays only where the answer really is an object, as RiverMart's search results are.

## Note (2026-09-09, second)

An operation with no `returns` has no answer to wait on, so a process that issues it waits on the event the operation raises instead, one dependency for the call and one for the fact. That is DDD's own shape, the event is the fact, and the model keeps it; the cost is that a caller of a returns-less command names two consumptions, and it is named here.

## Amendment (2026-09-09, second)

An operation without `returns` still completes, and a process may wait on that: `completed` is an answer with no shape, so a provisioning workflow that ends when an activation call succeeds names that completion rather than inventing a response (card 99). The note that a returns-less command costs two consumptions is superseded where the caller waits on the completion.

## Note (2026-09-10)

An asynchronous request whose reply arrives later, correlated, is modelled as the returns-less call plus the events the provider raises, which the caller's process waits on. NorthBank had declared a scheme submission as a synchronous call with an answer while describing the scheme answering on its own timings; card 105 makes it the exchange it is.

## Amendment (2026-09-10)

The 2026-09-09 amendment argued that a named collection and an object holding one are different shapes and gave `returns` its `many`; the same argument applies to a request and an event payload, where the model still offered only the wrapper, and petstore left `createUsersWithList` out. `ConsumableSchema.schema` carries `many` the way `returns` does (card 114, architect's ninth round).

## Note (2026-09-10)

A flat object with a `kind` field and attributes that apply only sometimes states its wire faithfully when the wire is that object; the misstatement this record refuses is a wrapper around something the wire does not carry. StreamLine's `TitleDetail` is the former, and what is wrong with it is that `seasons` is not marked optional for a film (card 119). The debate on unions (decision 18, amended) rests on this distinction.

## Note (2026-09-10)

The ref a process writes for a completion is `<operation>/completed`, beside `<operation>/returns` and `<operation>/rejects/<schema>` (decision 23; card 99 made it waitable, card 108 made the JSON path resolve it like the DSL).

## Amendment (2026-09-10, second)

`returns` and `schema` carry `many` and `rejects` did not, though a refusal answered as a root array of field errors is the shape this record's own argument names. A rejection entry may carry `many` (card 130).
