---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Ninth signoff blocker in correction; local full gate pending
progress: 95
clean-code-swept: true
updatedAt: 2026-10-01T04:40:00Z
---
# External contract has one timing

Issue #122. On exact head `3ee62a29`, OpenAI Astra low reproduced an external invariant with both `precondition` and `postcondition` true and zero diagnostics. The reader said Checked before while the model also promised a result. An external published contract must choose one timing.

## Checklist

- [x] Validator rejects both flags on an external context invariant
- [x] Focused regression covers direct and JSON-round-trip forms, with a valid postcondition-only twin
- [x] Rule catalog states the exclusive choice and generated validation reference rebuilt
- [ ] Full local gate and exact-head independent signoff

## Journal

- **lead** (2026-10-01): The focused `external-is-boundary` suite passes. No pinned diagnostic list was edited.

- **lead** (2026-10-01): Clean-code audit across SRP, DRY, naming, coupling, dead code, KISS, boundaries and reachable failure paths found no new violation above 0.5. Focused checks are green; the exact-head landing gate remains.
