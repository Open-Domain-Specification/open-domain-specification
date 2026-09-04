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
