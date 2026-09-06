---
status: Accepted
date: 2026-09-05
---
# Decision 21 — A consumption belongs to the consumer, and may name the operations behind it

## Current position (2026-09-10)

`by` exists on `ConsumptionSchema`, absent means the whole consumer, and `consumption-by-resolves` refuses an event; stable. The decision bullet that `by` may name policies of the consumer's context on any consumption no longer holds; see the correction of 2026-09-10 and decision 17's second amendment of 2026-09-08 (card 92): a policy or process is named on an event consumption, an operation consumption names the operation that makes the call (`consumption-by-operation`).

The section "no rule reads `by` as causality" no longer holds; see the amendment of 2026-09-07 (card 69): `by` is the one causal link across a boundary, the flow map and cycle walk follow it through the consumed operation to what it raises, and `raises-in-context` keeps it the only link. Order and timing are still not modelled. A front declares no `raises` for what it reaches (`raises-restated`, card 77).

`consumption-by-required` warns where a multi-operation consumer names no caller, across contexts (third amendment of 2026-09-08, card 90) and inside one (note of 2026-09-10, card 107); an external or big-ball-of-mud consumer is not asked (decision 28, card 107). A single-operation consumer is inferred as its own `by`, with no opt-out (amendment and note of 2026-09-09, card 95). Two consumptions of one pair need disjoint `by` (decision 26, card 89). An answer routes to the reactor whose `by` made the call (decision 23, card 104); a transitive `by`-chain routing is pre-specified for decision 17's reopening, not built (second note of 2026-09-10).

The consequences' petstore examples changed (cards 77 and 78).

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

## Note (2026-09-10)

The third amendment's warning for a multi-operation consumer that names no `by` was written for the crossing between contexts, and the same silence inside a context went unreported: a front on an application service with two operations that consumes an aggregate's operation without `by` reaches no events, the flow map stops, and nothing says so. The rule reads consumptions inside a context too (card 107, architect's eighth round).

## Note (2026-09-10, second)

Pre-specified for decision 17's reopening condition, so the design is not discovered later: an answer routes back along the local `by` chain to the nearest reactor that issued an operation on it, `routesTo` and `hearsAnswerOf` following `callsOut` transitively inside the context, cycle-guarded like `reachedEvents`, drawing the step from the operation the reactor issued. That keeps card 104's rule, to the caller and nobody else, because every hop is the reactor's own context and its own chain. One hop stays the rule until decision 17 reopens; nothing today needs more.

## Correction (2026-09-10)

The decision bullet says `by` may name "policies of the consumer's bounded context" on any consumption. Decision 17's second amendment narrowed that: a policy or process is named on an event consumption, and an operation consumption names the operation that makes the call, which `consumption-by-operation` enforces. The bullet stands as written on the day; the schema comment and the docs page that repeated it are corrected by card 124, and card 125 gives every decision a current-position section so a stale bullet is never the last word.

## Amendment (2026-09-10)

The second note pre-specified transitive answer routing and tied it to decision 17's reopening; the architect's twelfth round showed the tie was wrong. Events already reach through any number of local fronts and an answer stopped after one, and `consumable-kind` made the difference an error that dictates which front a process must issue. An answer routes back along the local `by` chain to the nearest reactor that issued an operation on it, exactly as the note specified; across a boundary it still travels one hop, to the caller and nobody else (card 126).

## Correction (2026-09-10, second)

Card 126's transitive routing added a fourth clause to `routesTo` that returned a single-operation consumer's sole operation as the route for any reactor in the context, without checking that the reactor issues it; with `by` absent a bystander heard the answer and could close a phantom ring, and with `by` written the same shape was refused. The inference behaves as `by: [thatOperation]` would, and the reactor must issue it (card 128, architect's thirteenth round).

## Amendment (2026-09-10, second)

A consumer that provides no operation could consume a foreign operation and nothing asked who calls it: `consumption-by-required` skipped consumers with fewer than two operations and the single-operation inference had nothing to infer from, so the reaction walk dead-ended silently, the case this record's third amendment exists to report. An operation consumption on a consumer that provides no operation is reported; an external or mud consumer is not asked (card 130, architect's fourteenth round).
