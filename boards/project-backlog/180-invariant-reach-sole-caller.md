---
column: review
labels: [core, model, bug]
priority: high
agent: lead
live: false
status: Integrated implementation and local audits complete; final clean-head gate, signoff and merge pending
progress: 90
clean-code-swept: true
updatedAt: 2026-10-01T14:42:37Z
---
# Invariant reach honours the inferred sole caller

Issue #130. Astra's thirteenth completed exact-head review found that the reaction walk treats an omitted `by` as the sole operation of its consumer, while aggregate and context precondition reach required that same caller to be written. The identical call therefore validated differently depending on redundant metadata.

## Checklist

- [x] Share the effective operation caller between the reaction walk and invariant reach
- [x] Direct and JSON-round-trip regressions for fetched answers and heard event payloads at aggregate and context scope
- [x] Keep ambiguous multi-operation consumers out of reach and assert the reviewer's explicit/inferred pair has zero diagnostics
- [x] Append the decision 21 clarification and record the review result
- [x] Clean-code review and full local landing gate on `4fe805c6`
- [ ] Exact-head independent signoff

## Journal

- **lead** (2026-10-01): Focused invariant tests and core build pass. The reviewer's complete counterexample now produces no diagnostic, both with explicit and inferred `by`, directly and after JSON round-trip. No pinned diagnostic list was edited; no GitHub CI was used.
- **lead** (2026-10-01): Clean-code audit of SRP, DRY, naming, coupling, dead code, simplicity, boundaries and reachable failures found no scored violation. One effective-caller function removes the prior duplicated inference; ambiguous callers remain excluded. Biome, focused tests and TypeScript compile pass.
- **lead** (2026-10-01): The unmodified full local gate passed on exact clean `4fe805c6`: core 1080, all five models, schema and ESM checks, pages 1019 at 100% coverage and browser 430 passed/20 skipped. Astra's fourteenth review confirmed the #130 correction across 32 caller-reach cases and found separate timing defect #131; final signoff remains pending.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.
