---
column: doing
labels: [core, model, bug]
priority: high
agent: lead
live: false
status: Focused correction passing; full local gate and signoff pending
progress: 70
clean-code-swept: true
updatedAt: 2026-10-01T08:35:00Z
---
# Invariant reach honours the inferred sole caller

Issue #130. Astra's thirteenth completed exact-head review found that the reaction walk treats an omitted `by` as the sole operation of its consumer, while aggregate and context precondition reach required that same caller to be written. The identical call therefore validated differently depending on redundant metadata.

## Checklist

- [x] Share the effective operation caller between the reaction walk and invariant reach
- [x] Direct and JSON-round-trip regressions for fetched answers and heard event payloads at aggregate and context scope
- [x] Keep ambiguous multi-operation consumers out of reach and assert the reviewer's explicit/inferred pair has zero diagnostics
- [x] Append the decision 21 clarification and record the review result
- [ ] Clean-code review and full local landing gate
- [ ] Exact-head independent signoff

## Journal

- **lead** (2026-10-01): Focused invariant tests and core build pass. The reviewer's complete counterexample now produces no diagnostic, both with explicit and inferred `by`, directly and after JSON round-trip. No pinned diagnostic list was edited; no GitHub CI was used.
- **lead** (2026-10-01): Clean-code audit of SRP, DRY, naming, coupling, dead code, simplicity, boundaries and reachable failures found no scored violation. One effective-caller function removes the prior duplicated inference; ambiguous callers remain excluded. Biome, focused tests and TypeScript compile pass.
