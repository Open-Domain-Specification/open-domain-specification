---
column: review
labels: [model, bug]
priority: high
agent: lead
live: false
status: Integrated implementation and local audits complete; final clean-head gate, signoff and merge pending
progress: 95
clean-code-swept: true
updatedAt: 2026-10-01T14:42:37Z
---
# Aggregate pages distinguish checks from persistent rules

Issue #121. On exact head `3ee62a29`, Claude Opus 5.5 high found that NorthBank's PaymentInstruction precondition and Card answer guarantee were presented beside root-enforced save rules under a blanket claim. Markdown omitted the timing of every aggregate invariant. All three Svelte hosts share this page.

## Checklist

- [x] Aggregate and Markdown tables state when each invariant is checked or held, using one core timing label
- [x] Root, entity, value and consumable copy is scoped to the actual claim
- [x] NorthBank precondition, postcondition and unflagged rule are checked in Svelte and Markdown before and after JSON round-trip
- [x] Generated reference model pages rebuilt and pinned diagnostics unchanged
- [ ] Full local gate and exact-head independent signoff

## Journal

- **lead** (2026-10-01): The focused Markdown and Svelte regressions pass. Full gate and signoff remain pending.

- **lead** (2026-10-01): Clean-code audit across SRP, DRY, naming, coupling, dead code, KISS, boundaries and reachable failure paths found no new violation above 0.5. Focused checks are green; the exact-head landing gate remains.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.
