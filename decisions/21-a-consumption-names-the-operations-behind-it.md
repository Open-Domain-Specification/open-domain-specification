---
status: Accepted
date: 2026-09-05
---
# Decision 21 — A consumption belongs to the consumer, and may name the operations behind it

## Context

A consumption is declared on an aggregate or a service, so the model reads it
as the whole node depending on the consumable. Usually one or two of the
node's operations do. StreamLine's billing consumes Identity's
`HouseholdCreated` and the disc business's monthly export, but only one
reaction reads each; renewing, dunning and answering entitlement never touch
them. Petstore's `OrderApp` consumes Catalog's `ReservePetForOrder` from one
of its own operations, while placing, reading and deleting an order never
call Catalog at all. The sixth external review run (issue 6) reported the
first shape; the seventh (issue 4) asked the same question from the other
side — which of the provider's callers is behind an operation — and one field
answers both.

## Decision

- `ConsumptionSchema.by?: Array<{ $ref }>`: the consumer's own operations, or
  policies of the consumer's bounded context, that make this exchange. In the
  DSL, `node.consumes(consumable, { by: [renew, dunOnFailure] })`.
- Absent means the whole consumer, which stays the default and the common
  case. There is no marker for "all of them": an empty `by` and an absent one
  say the same thing, so the model has one way to say it.
- A policy is allowed beside an operation because a policy is how a context
  reacts, and reacting to a published fact is the commonest reason a
  consumption exists at all. It must be a policy of the consumer's own
  context, as `then` already is (decision 17).
- Rule `consumption-by-resolves`, an error: every `by` names an operation the
  consumer itself provides, or a policy of the consumer's context. An event
  is refused — an event is something that has already happened, so it calls
  nothing.

### Why the atlas does not change, and what this is not

The consumable map draws the same nodes and the same edge: the consumer still
depends on the provider, and that is the strategic fact. What `by` adds is
evidence beneath it, for the reader who asks "what of this service actually
calls out?", and it appears as a column on the consumes tables, a line on the
generated pages and the hover on the map's edge — never as a new node or a
new edge.

Nothing derives a sequence diagram, a call graph or an ordering from it. `by`
is a set, not a sequence; it says which of the consumer's parts touch the
dependency, not when or in what order, and no rule reads it as causality.
That restraint is what keeps it cheap: one optional question in the
interview, asked only when the honest answer is "one or two of them".

## Consequences

- Breaking schema change (`by` on `ConsumptionSchema`); no migration, in line
  with the repo's no-backwards-compatibility rule. A model that says nothing
  is unaffected, since absent is the default.
- Surfaces that list consumptions gain one field: core's consumable map edge
  carries the names, the doc generator prints a **Made by** line and a
  **Made By** column, the pages consumes table gains the same column, and the
  consumable map's edge hover shows them.
- The skill's interview asks "which operations of this service actually make
  that call?" once per consumption, and takes "all of it" for an answer.
- Reference models set it only where the difference is plain: StreamLine's
  two inbound consumptions into Billing, each made by one policy, and
  petstore's `ReservePetForOrder`, made by one operation of `OrderApp`. The
  identical consumption beside it is left plain on purpose, so both readings
  appear in one model.
- Rejected: a `calls` link from the provider's operation back to its callers.
  It would be the same fact stored on the far side of a boundary, where the
  provider has no way to know it and no reason to maintain it.

## Amendment (2026-09-07)

The record said no rule reads `by` as causality. The architect review showed the cost: a policy issues a local operation that calls out through the boundary, and there the flow map and `reaction-cycle` stopped, so a ring through two contexts validated clean. `by` is the one causal link the model has across a boundary, and it is read as one: the flow map and the cycle walk continue from a local operation through the consumption it makes to the consumed operation and what that raises (card 69). Only a consumed operation continues the chain — consuming an event is a subscription, not something the consumer causes — and the new `raises-in-context` rule keeps that link the only one there is, by refusing an operation that claims to raise another context's event. Order and timing are still not modelled.

## Amendment (2026-09-08, second)

The Consequences said petstore's `MarkPetSoldForOrder` consumption was left plain so both readings appear in one model. Card 77 gave it its `by`, because the reaction chain needed it; the plain reading now appears on `GetPetSummary` and `DeliverOrder` instead, and card 78 gives the latter its `by` too. A front that calls out declares no `raises` of its own for what it reaches (`raises-restated`); the pages say what it reaches beneath its Raises list.

## Amendment (2026-09-08, third)

`by` is the causal link, and a model without it has a hollow reaction walk: twenty-five of forty-two cross-context operation consumptions in the reference models named no caller and NorthBank's instruction lifecycle dead-ended at every outbound step. Where the consumer provides more than one operation the caller is ambiguous, and `consumption-by-required` (warning) asks for it (card 90). A consumer with one operation is its own `by`.

## Amendment (2026-09-09)

The third amendment said a consumer with one operation is its own `by`, and the reaction walk did not read it that way, so a single-operation consumer's call reached nothing. The walk now infers the caller when the consumer provides exactly one operation and `by` is empty (card 95).

## Note (2026-09-09)

The single-operation inference has no opt-out on purpose. A consumer whose one operation is not the caller says so by naming the caller, which decision 17's second note prescribes as a front on the application service; a model that cannot name the caller has not yet said who acts.
