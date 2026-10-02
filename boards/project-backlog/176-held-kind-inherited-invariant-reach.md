---
column: review
labels: [model, bug]
priority: high
agent: lead
live: false
status: Integrated implementation and local audits complete; final clean-head gate, signoff and merge pending
progress: 75
clean-code-swept: true
updatedAt: 2026-10-01T14:42:37Z
---
# A held value kind puts inherited attributes in invariant reach

Issue #126. Astra's eleventh exact-head review reproduced an Invoice holding Fee, a kind of Money, while the aggregate and context rejected a constraint on inherited Money.amount. Decision 22 says Fee has Money's attributes; decision 27 puts held values in the invariant boundary.

## Checklist

- [x] Holding a specialised value includes its ancestor kinds in aggregate and context invariant reach
- [x] Focused test covers both scopes and an unheld sibling kind before and after JSON round-trip
- [x] Decision 22 states the corrected reach
- [ ] Clean-code review and full local gate
- [ ] Exact-head independent signoff

## Journal

- **lead** (2026-10-01): The holding walk now records each parent of a discovered value kind, while following the value's inherited attributes for composition. A cycle guard keeps invalid specialisation graphs finite. The focused direct and round-trip regression passes; an unheld sibling Rate remains rejected.
- **lead** (2026-10-01): Full validator suite (491), core typecheck and formatter pass. Clean-code pass over the changed walk and test found no scored violation: ownership remains local, the ancestor loop is cycle-safe, and the test covers the one-way boundary.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.
