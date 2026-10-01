---
column: doing
labels: [core, model, bug]
priority: high
agent: lead
live: false
status: Focused correction and clean-code audit passing; full local gate and signoff pending
progress: 70
clean-code-swept: true
updatedAt: 2026-10-01T09:05:00Z
---
# A precondition cannot read its own future answer through a front

Issue #131. Astra's fourteenth completed exact-head review found that a front consuming a guarded operation made that operation's answer look like a fetched fact before it ran. The same precondition was rejected without the front and accepted with it. Aggregate and context owners, explicit and inferred `by`, and direct and JSON-round-trip models all showed the mismatch.

## Checklist

- [x] Exclude the guarded operation's own consumption by identity from fetched facts
- [x] Regress fronted/unfronted aggregate and context rules, explicit/inferred caller, direct and JSON round-trip
- [x] Preserve a valid separate earlier query returning the same schema
- [x] Append decision 19 note and record the exact review result
- [ ] Clean-code review and full local landing gate
- [ ] Exact-head independent signoff

## Journal

- **lead** (2026-10-01): The focused timing matrix passes. The exclusion is by consumed operation, not schema, so another query may still supply the same shape. No pinned diagnostic list was edited and no GitHub CI was used.
- **lead** (2026-10-01): Clean-code audit across SRP, DRY, naming, coupling, dead code, simplicity, boundaries and reachable failures found no scored violation. The validator change is one identity guard; the timing fixture keeps the negative and same-shape positive adjacent. Biome and TypeScript compile pass.
