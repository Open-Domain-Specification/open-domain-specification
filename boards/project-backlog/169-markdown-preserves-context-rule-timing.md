---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Eighth signoff found false Markdown timing; correction and focused tests pass, integrated gate pending
progress: 85
clean-code-swept: true
updatedAt: 2026-10-01T05:05:00Z
---
# Markdown preserves context rule timing

Issue #119. On exact head `a2cef010`, OpenAI Astra low reproduced a valid `postcondition: true` on a context operation. Its Svelte page said Checked after, while generated Markdown said every context rule was checked before acting and hid the timing flag. The lead also checked decision 28's valid external event postcondition: that is a guarantee of the event payload, not an operation answer.

## Checklist

- [x] Markdown context rules have a Check column distinguishing precondition, postcondition, unflagged checker and external event payload guarantee
- [x] Valid before/after operation rules and an external event guarantee render before and after JSON round-trip
- [x] The Svelte invariant page reads an external event guarantee and links to the event with the correct kind
- [x] The shared Svelte context page no longer says every rule is checked before acting or denies operation/event contracts when its local rule list is empty
- [x] Schema comments, generated authoring reference, interview guide and tactical documentation describe the same timing
- [ ] Pinned diagnostics and generated outputs remain consistent

## Gates

- [x] Focused Markdown, Svelte and type checks
- [ ] `bash scripts/verify-all.sh` on the corrected committed head
- [ ] Exact-head independent final signoff

## Journal

- **lead** (2026-10-01): Issue #119 records the reader story. The context table now prints timing as a separate fact, and the lead extended the correction to decision 28's event-only published contract. No validator behavior changed. The new tests pass for operation timing and an event payload before and after round-trip.
- **lead** (2026-10-01): Clean-code pass: the Markdown row derives its label from existing flags and guarded targets, and the Svelte page uses one event-only predicate for its heading and text. Generated reference changes come from the core build. No high-scored marker or unsafe lookup remains.
- **lead** (2026-10-01): Adjacent reading check found the same old before-acting sentence on the Svelte context page and an empty state that claimed all other rules belonged to aggregates. Its copy is now scoped to context declarations and directs the reader to each rule's detail page. The edge-case fixture contains a postcondition and its regression rejects the old sentence.
