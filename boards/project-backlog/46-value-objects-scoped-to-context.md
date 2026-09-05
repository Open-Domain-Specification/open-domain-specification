---
column: done
labels: [backend, ddd]
priority: med
updatedAt: 2026-09-06T10:00:00.000Z
---
# Value objects are scoped to the aggregate, so a context's Money is declared per aggregate

Found by the architect while reviewing an external critique: `ValueObject` lives under an aggregate, so a value object shared across a context's aggregates (NorthBank's `Money`, petstore's `PetStatus`) is re-declared in each, and `models/_shared/src/index.ts:19-27` exists only to do that. Decide whether value objects hoist to context scope (an aggregate then references its context's value object) and what the shared-kernel relationship should mean for value objects between two contexts that declare it. Needs a decision record before any card; the critique's "SharedKernel namespace" was rejected.

## Comments

- **lead** (2026-09-06T12:00:00.000Z): Superseded by decision 16 and card 49.
