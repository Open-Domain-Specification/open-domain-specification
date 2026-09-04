---
status: Proposed
date: 2026-09-06
---
# Decision 19 — An invariant may constrain the operations that guard it

## Context

`InvariantSchema.constrains` names entities, value objects and attributes (decision 05). Many invariants are transition rules: petstore's `SoldNotReopen` ("once sold, a pet does not revert to available") is about what `ChangePetStatus` may do, and today it can only point at the status attribute.

## Decision

- `constrains` may also name a consumable of the same aggregate. The invariant then reads as the rule that operation must uphold.
- Invariants stay prose; no expression language (decision 15).

## Consequences

- The `invariant-constrains` rule accepts consumables of the invariant's aggregate; the invariant page lists them under "Guarded by"; the consumable page lists its invariants; the doc generator follows; petstore's `SoldNotReopen` names `ChangePetStatus`.
