---
column: doing
labels: [model, bug, docs]
priority: high
agent: lead
live: false
status: Ninth signoff blocker in correction; local full gate pending
progress: 95
clean-code-swept: true
updatedAt: 2026-10-01T04:40:00Z
---
# Invariant reach guidance matches the validator

Issue #123. On exact head `3ee62a29`, OpenAI Astra low found authoring guidance that excluded inherited and composed value attributes and a schema comment that reversed operation request/answer timing. Both disagreed with the validator and decision 27.

## Checklist

- [x] Schema comment, authoring skill, interview guide and tactical documentation state the implemented reach
- [x] Core and skill builds regenerate the model reference and JSON schema descriptions
- [x] Drift tests pin the corrected statements across the hand-written and generated surfaces
- [ ] Full local gate and exact-head independent signoff

## Journal

- **lead** (2026-10-01): The focused drift suite passes after generation. The tracked schema copies still need the model builds and full gate.

- **lead** (2026-10-01): Clean-code audit across SRP, DRY, naming, coupling, dead code, KISS, boundaries and reachable failure paths found no new violation above 0.5. Focused checks are green; the exact-head landing gate remains.
