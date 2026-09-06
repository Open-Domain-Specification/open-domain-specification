---
status: Proposed
date: 2026-09-06
---
# Decision 17 — A context acts through its own boundary

## Current position (2026-09-10)

Status is Proposed. The three decision rules stand: `policy-in-context` (`then` names own-context operations; `on` crosses only through a consumption), `aggregate-not-public` (operations only; events are published as raised), and `domain-service-internal`. The domain-service half was argued both ways and stands (amendment of 2026-09-10); it reopens only when both conditions hold: decision 21's answer routing follows the local `by` chain and has shipped, and a blind or interview-rewritten model carries a domain service with a rule of its own that must consume across a boundary. Card 117's clinic model produced the shape without the rule and did not meet the condition (note after card 117; card 122). One exemption this record does not name: a kernel context's aggregate operations may be consumed by its sharers (decision 16, card 98).

The outbound half was added: an aggregate consumes only its own context's consumables (`aggregate-consumes-inside`, card 73), and not another aggregate's operation in its own context (decision 29, card 100); a domain service likewise consumes only its own context's (second amendment of 2026-09-08, card 92). A policy holds no consumption; where a policy reacts, the consumption sits on the application service with `by` naming the policy (2026-09-07; decision 21). `subscription-consumed` requires that consumption (2026-09-08, card 90), and a consumed event nothing reacts to is refused (card 92; `subscription-backed` skips a big-ball-of-mud consumer, decision 28, card 124). `by` on an operation consumption names operations only (card 92; decision 21's correction of 2026-09-10).

Named costs, all still accepted: every outbound call is an internal operation on the application service, the boundary drawn twice; a subscribe-only context needs an application service that provides nothing; an application-service operation may raise an aggregate's event directly; an aggregate that initiates an outbound call reads as its front's act, `by` naming the front (notes of 2026-09-09, card 98); a domain service holds no outbound port and the front hands in what it fetched; an application-service query that reads an aggregate is invisible to the reaction walk (note of 2026-09-10). The pricing example is the record's answer: the front is the caller, and it costs no extra operation when the use-case operation is the `by`.

Decision 08's crossing table reads `on` yes, `then` no, as this record corrected it. A precondition on an aggregate's operation may read what its front fetched (decision 19, card 116), which is how the clinic's record-exists check is drawn (card 122).

## Context

Two shortcuts in the model let a context reach into another. A policy's `then` may name an operation provided by another context (petstore's Sales policies issue Catalog's `reservePet` and `markPetSold`, `workspace.ts:604-615`), while decision 08 says `PolicySchema.then` may not cross a file; the model is valid in one file and a load error in two. And an aggregate may provide a consumable carrying an upstream pattern (`Pet` provides `ReservePet` as an open host service, `:280-286`) alongside its application service doing the same, so nothing says which of the two is the context's public boundary.

## Decision

- A policy's `then` names operations of the policy's own context. To act on another context, the local operation that consumes the foreign one is what the policy names. Rule `policy-in-context`, an error.
- An aggregate's operations are the context's internal vocabulary: they may not carry an upstream pattern and may not be consumed from another context. What a context offers outward is provided by an application service. Rules `aggregate-not-public` (error on the pattern, error on a foreign consumption). Events are different: an aggregate raises its domain events, and the context publishes them as they are; the `raises` link is between the aggregate's operation and its event, and routing events through a service would break it for nothing. The rules therefore cover operations only. The asymmetry is the point: an inbound operation is someone else's intent, and a context decides through its application service whether and how to honour it; an outbound event is a fact that has already happened inside, published as it is. Mediating requests and publishing facts are different acts, and the model draws them differently.
- A domain service is likewise internal: its operations may not carry an upstream pattern or be consumed from outside. Rule `domain-service-internal`.

### A policy may react to another context's event; it may not act in another context

`PolicySchema.on` is a consumption: reacting to a foreign event is how a context integrates, and it crosses a context and a file exactly as a consumption does, through the file's declared dependency. `PolicySchema.then` names the policy's own context's operations only. Decision 08's crossing table is corrected: `on` may cross a file, `then` may not. The `separate-ways` rule treats a policy's `on` as a consumption.

## Consequences

- No schema change; three rules and their catalogue entries. Decision 08's table is now consistent with the validator.
- Petstore: `PetApp` becomes the open host; `Pet`'s `ReservePet` and `MarkPetSold` become internal and `PetApp` provides the public operations that use them; Sales' policies name Sales' own `orderApp` operations, which consume Catalog's. The other three models are checked for the same shape.
- The consumable map reads as intended: what crosses a boundary always leaves an application service.
- An application service's aggregates are read from what it consumes: the internal operations it depends on name them. No `orchestrates` field is added; it would restate the consumptions.

## Amendment (2026-09-07)

The record covered inbound only: an aggregate may not be consumed from outside, but nothing stopped an aggregate consuming another context's operation, and two reference models did so while two routed the same call through a service. The outbound half is the same principle: an aggregate is a consistency boundary, not a client. It consumes only its own context's consumables; a foreign operation or event is consumed by an application service or a policy, which hands the aggregate what it needs. `aggregate-consumes-inside` (card 73). A policy holds no consumption of its own, so where a policy is what reacts, the consumption sits on the context's application service and names the policy in its `by` (decision 21).

## Amendment (2026-09-08)

This record said a policy's `on` is a consumption and nothing made it one: three reactors subscribed to another context's event with no consumption anywhere, so neither map drew the dependency and the anti-corruption rule never saw it. `subscription-consumed` (card 90) requires the consumption, on the service or aggregate that owns the reaction, with `by` naming the reactor. A named cost stays: every outbound call is an internal operation on the application service that consumes the foreign one, even for a conformist with no translation to name. The two operations are the boundary drawn twice, once on each side, and the model keeps it because the flow map and the reaction walk read the boundary there.

## Amendment (2026-09-08, second)

Three things this record implied and did not enforce, now enforced (card 92): `by` on a consumption of an operation names operations only, because a reactor issues a local operation that makes the call and the reaction walk reads the boundary there; a domain service consumes only its own context's consumables, for the same reason an aggregate does; and a consumed event that nothing reacts to is a claim with nothing under it. Two costs this record accepts and now names: a context that only subscribes needs an application service to hold the subscription, a node that provides nothing, because consumptions hang on nodes and a context is not a node; and an application service's operation may raise an aggregate's event directly, which the model allows because the front may be the whole use case, while the convention the reference models prefer is to reach the event through the aggregate's operation.

## Note (2026-09-09)

Two more named costs of the boundary drawn twice. An aggregate that initiates an outbound call cannot say so directly: the application service makes the call and the aggregate's operation is what the chain reaches, so a case whose resolution raises a return elsewhere reads as the service's act. And a domain service may not hold an outbound port; a pricing service consulting a tax provider is modelled as the application service fetching the rate and handing it in. Both are the model's opinion that domain logic does not wait on a neighbour, stated as a rule; a reader who models hexagonally with ports in the domain layer pays for it in one extra operation per call.

## Note (2026-09-09, second)

An aggregate-initiated outbound call is drawn as the record says: the application service fronts the aggregate's operation and makes the call, `by` names the front, and the chain reaches the aggregate's operation through it. RiverMart's case resolution takes that form (card 98). There is no marker for "made by something I cannot name"; the caller is named.

## Note (2026-09-10)

An application-service query that reads an aggregate consumes no operation of it, so the read is invisible to the reaction walk and to the aggregate's page; the walk follows calls and a read is not one. Named by the architect's tenth round; the cost is accepted, a query's description says what it reads.

## Amendment (2026-09-10, after the debate)

After Codex's sixth to ninth reviews and the architect's eighth to tenth, the lead proposed reopening the domain-service half of this record. At the owner's instruction the lead designer argued for and the architect against, each answering the other, and both ended in the same place. The rule stands. Only the operation half would ever reopen: a subscription belongs to a reactor and stays refused on a domain service. The aggregate rule and the inbound rule (`domain-service-internal`) stand on reasons of their own, the consistency boundary and a context deciding through its front whether to honour foreign intent. The reopening condition is agreed and testable, and both parts must hold: (a) decision 21's answer routing is extended to follow the local `by` chain to the nearest reactor that issued an operation on it, specified there and shipped before this rule moves, because with a port on a domain service a process issuing the front no longer hears the neighbour's answer (the architect's probe); and (b) card 117's blind model, or a reference model rewritten from its interview notes, carries a domain service that holds a rule of its own and must consume across a boundary, or invents a front that issues nothing but the call. Until then the 2026-09-09 note's pricing example is the record's answer: the front is the caller, and it costs no extra operation when the use-case operation is the `by`. The tax the reviewers name is mostly the reactor-to-front hop, which neither side proposed touching. NorthBank's bureau pull is a missing external context, not this rule (card 119).

## Note (2026-09-10, after card 117)

The blind clinic model produced the shape the condition names, a domain service consuming across a boundary, and both debate parties judged it from the model and the interview: the service holds no rule of its own, only the call (`KycScreening`'s shape, card 92), and the nurse's sentence granting it reads as the brief's permission recited back, because the brief named the shape. Condition (b) is not met; the rule stands and the condition is unchanged. The nurse's real check, a record must exist before a referral is accepted, is a precondition on the aggregate's operation reading a summary its front fetched, decision 19's card-116 shape (card 122).

## Note (2026-09-10, second)

One exemption this record did not name: a kernel context's aggregate operations may be consumed by the contexts that share the kernel, and for any other context the aggregate stays internal (decision 16, card 98).
