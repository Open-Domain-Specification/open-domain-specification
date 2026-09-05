---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide-deep
updatedAt: 2026-09-08T17:10:00.000Z
---
# A process reacts to an answer; the boundary is sealed for value objects; decision 17 is enforced

Prowl's third review, each item probed. Decision 16 says a value object borrowed across contexts is allowed only through a shared kernel or a conformist and `schema-context` never reads `attribute.valueobject`, so an insurer's Claims typing a reserve by Policy Admin's Money with no relationship validates clean. A process can wait only on events, so RiverMart publishes `PaymentDeclined` as an event the Checkout process waits for, against decision 25's own example, and NorthBank describes a synchronous verdict and models it as two published events. A `by` naming a policy or process on an operation consumption is accepted and silently breaks the reaction walk, which petstore relies on; domain services consume foreign consumables in two models against decision 17. Plus the smaller items below.

## Checklist

- [ ] `valueobject-context` (error): an attribute's `valueobject` in another context is allowed only through a shared kernel with that context or a conformist relationship toward it, the same predicate `schema-context` uses; `relationship-declared` counts a value object borrowing as a crossing; test with the review's probe (a root typed by another context's Money with no relationship) which must error
- [ ] A process's `on` and `ends`, and a policy's `on`, may name a schema that an operation of the same context's consumptions returns or rejects with, meaning "when that answer comes back"; `consumable-kind` accepts it; the reaction walk steps operation to its returns and rejects to the reactor; the flow map draws the answer as an edge from the operation; decision 23 amended by the lead; RiverMart's `PaymentDeclined` becomes a rejection of `AuthorisePayment` the Checkout process waits on, and NorthBank's `ScoreTransaction` returns a verdict schema its process reacts to, both with DISCOVERY.md lines
- [ ] `consumption-by-operation` (error): `by` on a consumption of an operation names operations only; a reactor issues a local operation that makes the call (decision 17); petstore's `orderApp.consumes(getPetSummaryOp, { by: [orderFulfilment] })` gains the local operation and its comment is rewritten to say why the step is real
- [ ] `domain-service-consumes-inside` (error): a domain service consumes only its own context's consumables; NorthBank's `KycScreening` and StreamLine's `Ranker` move their foreign consumptions to their application services with `by`
- [ ] `subscription-backed` (warning): a consumed event that no policy or process of the consumer's context reacts to and that names no `by` is a claim with nothing under it; the eleven in the models gain their reactor or come out
- [ ] `invariant-in-aggregate`'s why-text and the invariant page distinguish a guard: an invariant that constrains an operation is a precondition checked when that operation runs, not a rule true again after every save; decision 27 noted by the lead
- [ ] A value object's relations target value objects only (`uses`); a relation from a value object to an entity is refused by `value-object-shape` with the reason; `cross-aggregate-reference` no longer has the gap
- [ ] `entity-identity` skips a big ball of mud like the other three rules
- [ ] `returns` of a list is an answer schema whose attribute holds the list, as RiverMart's `SearchResults` does; petstore's `FindPetsByStatus` returns a `Pets` schema; decision 13 noted by the lead
- [ ] RiverMart demonstrates a deadline: Payments' application service `ExpireAuthorisations`, called by a scheduler, raises `AuthorisationExpired` after `Authorisation.expiresAt`, and the Checkout process ends on it; DISCOVERY.md says so
- [ ] `InvariantSchema` doc comment says an aggregate invariant constraining a value object means that aggregate's instances of it; RiverMart's `PaymentIntent.orderId` becomes optional per its own comment; Last Mile's relationship description stops naming the retired role-coherence warning
- [ ] Decisions 13, 15, 16, 17, 23, 25, 27 amended by the lead; you confirm the mechanics match
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained; the review's probes P2, P3a, P4, P5, P6 rerun and reported

## Comments

- **optimus-prime** (2026-09-08T17:10:00.000Z): Ironhide-deep, justified by the reach: a new reaction step, five rules, three models and seven decisions. After card 91 lands (the lead will say); `feat!`.
