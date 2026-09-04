---
status: Proposed
date: 2026-09-06
---
# Decision 17 — A context acts through its own boundary

## Context

Two shortcuts in the model let a context reach into another. A policy's `then` may name an operation provided by another context (petstore's Sales policies issue Catalog's `reservePet` and `markPetSold`, `workspace.ts:604-615`), while decision 08 says `PolicySchema.then` may not cross a file; the model is valid in one file and a load error in two. And an aggregate may provide a consumable carrying an upstream pattern (`Pet` provides `ReservePet` as an open host service, `:280-286`) alongside its application service doing the same, so nothing says which of the two is the context's public boundary.

## Decision

- A policy's `then` names operations of the policy's own context. To act on another context, the local operation that consumes the foreign one is what the policy names. Rule `policy-in-context`, an error.
- An aggregate's consumables are the context's internal vocabulary: they may not carry an upstream pattern and may not be consumed from another context. What a context offers outward is provided by an application service. Rules `aggregate-not-public` (error on the pattern, error on a foreign consumption).
- A domain service is likewise internal: its consumables may not carry an upstream pattern or be consumed from outside. Rule `domain-service-internal`.

## Consequences

- No schema change; three rules and their catalogue entries. Decision 08's table is now consistent with the validator.
- Petstore: `PetApp` becomes the open host; `Pet`'s `ReservePet` and `MarkPetSold` become internal and `PetApp` provides the public operations that use them; Sales' policies name Sales' own `orderApp` operations, which consume Catalog's. The other three models are checked for the same shape.
- The consumable map reads as intended: what crosses a boundary always leaves an application service.
