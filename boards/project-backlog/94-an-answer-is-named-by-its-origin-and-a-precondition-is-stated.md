---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
updatedAt: 2026-09-08T23:10:00.000Z
---
# An answer is named by its origin; a precondition is stated, not inferred

Codex review run 4, issues 1 and 4, both card 92's. A reactor names an answer by its schema, so when `AuthorisePayment` and `RefundPayment` both reject with `PaymentDeclined` the reaction walk connects both to the cart-reopening policy and nothing warns. And card 92 made "constrains an operation" mean "is a precondition", which conflates what kind of rule something is with which operation keeps it: `PostEntry` must produce balanced postings and the balance rule stays true afterwards.

## Checklist

- [ ] An answer has a ref of its own: `<operation ref>/returns` and `<operation ref>/rejects/<schema id>`; a policy's `on` and a process's `on` and `ends` name answers by those refs, never by a bare schema; `getReactionTriggerByRef` resolves them; the DSL takes `op.returned()` and `op.rejected(schema)` (or the closest fit, say which on the card); `toSchema`/`fromSchema`; the ref grammar documented
- [ ] The reaction walk and the flow map step from exactly the named operation to its answer to the reactor; `consumable-kind` refuses an answer of an operation the reactor's context does not consume and a rejection the operation does not declare; test with the review's two-operation case, which must connect only the one named
- [ ] `InvariantSchema.precondition?: boolean`: a precondition is checked before the operation it names runs and is not kept true afterwards; an invariant that names an operation without the flag is kept by that operation and stays true after it; `invariant-in-aggregate` and the invariant page say which by the flag, not by whether an operation is named; `precondition-names-operation` (error) when the flag is set and no operation is named; the five reference preconditions set the flag; NorthBank's `DailyLimit` re-read against its own description
- [ ] Decisions 23 and 27 amended by the lead; you confirm the mechanics match
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Comments

- **optimus-prime** (2026-09-08T23:10:00.000Z): Ironhide, now; `feat!`. Precise; do not widen.
