---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Tenth signoff blocker in correction; local full gate pending
progress: 95
clean-code-swept: true
updatedAt: 2026-10-01T05:10:00Z
---
# Value-object invariants have construction timing only

Issue #124. Both tenth-round reviewers reproduced a standard's value-object invariant carrying `precondition`, `postcondition`, or both with zero diagnostics. A value rule is true by construction. Svelte then called it a guardless precondition while Markdown called it a value rule.

## Checklist

- [x] `invariant-in-value-object` rejects either timing flag in modelled and external contexts; call-timing rules keep their existing validator path
- [x] Focused tests cover each flag combination, the valid unflagged twin, and JSON round-trip
- [x] Decision 27/28 notes, rule catalog, skill and tactical guidance state construction-only timing
- [x] Generated references and all model schema copies rebuilt; pinned diagnostics unchanged
- [ ] Full local gate and exact-head independent signoff

## Journal

- **lead** (2026-10-01): The focused validator cases pass. The rule is checked by value ownership, so an external context cannot bypass it.

- **lead** (2026-10-01): Clean-code audit found one rule owning construction timing and a separate call-timing iterator, with no duplicate timing error in modelled contexts. Generated references and all schema copies were rebuilt, and drift checks pass. No high-scored marker remains.
