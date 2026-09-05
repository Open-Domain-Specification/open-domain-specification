---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
updatedAt: 2026-09-08T11:40:00.000Z
---
# Presence is not size; a borrowed value is inside the boundary; one pair may carry several exchanges

Codex review run 2, issues 1, 3 and 8, each reproduced. `attribute-relation-coherence` warns when a required list has cardinality `*`, but a required list may be empty (Swagger's `photoUrls` is required with no minimum, and petstore declares `1..*` to dodge the warning). An aggregate invariant may not constrain the attributes of a shared-kernel value object its entities hold, because the scope check reads where the type is defined rather than where the instance lives. And `consumption-once` refuses a second consumption of the same consumable by the same consumer even when the two are made by different operations with different patterns and dispositions.

## Checklist

- [ ] Coherence: a required non-array pairs with `1`, an optional non-array with `0..1`, an array with `*` or `1..*` whether or not it is optional (presence says whether the list is there, cardinality says how many it may hold); petstore's `photoUrls` becomes `*` to match its contract; tests for the four cases
- [ ] `invariant-in-aggregate` and `invariant-in-context` accept a value object, and that value object's attributes, when an entity or attribute inside the invariant's own boundary holds it, wherever the value object is defined (shared kernel or conformist borrowing); a value object nobody in the boundary holds is still refused; test with the review's invoice holding a shared `Money` and an invariant on `Money.amount`
- [ ] A consumer may consume one consumable more than once when every such consumption names a non-empty, mutually disjoint `by`; `consumption-once` becomes that rule with a fix text that says name the callers; the consumption ref appends the first `by` caller's id only when the pair is not unique, so an existing single consumption keeps its ref; `findConsumption`, the extension's locate and the pages row anchor follow; round-trip test
- [ ] Decisions 24, 26 and 27 amended by the lead; you confirm the mechanics match
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Comments

- **optimus-prime** (2026-09-08T11:40:00.000Z): Ironhide, now; `feat!`.
