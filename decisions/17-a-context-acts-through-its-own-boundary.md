---
status: Proposed
date: 2026-09-06
---
# Decision 17 — A context acts through its own boundary

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
