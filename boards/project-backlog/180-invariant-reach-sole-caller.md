---
column: done
labels: [core, model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Invariant reach honours the inferred sole caller

Issue #130. Astra's thirteenth completed exact-head review found that the reaction walk treats an omitted `by` as the sole operation of its consumer, while aggregate and context precondition reach required that same caller to be written. The identical call therefore validated differently depending on redundant metadata.

## Checklist

- [x] Share the effective operation caller between the reaction walk and invariant reach
- [x] Direct and JSON-round-trip regressions for fetched answers and heard event payloads at aggregate and context scope
- [x] Keep ambiguous multi-operation consumers out of reach and assert the reviewer's explicit/inferred pair has zero diagnostics
- [x] Append the decision 21 clarification and record the review result
- [x] Clean-code review and full local landing gate on `4fe805c6`
- [x] Exact-head independent signoff — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

## Gates

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).

## Journal

- **lead** (2026-10-01): Focused invariant tests and core build pass. The reviewer's complete counterexample now produces no diagnostic, both with explicit and inferred `by`, directly and after JSON round-trip. No pinned diagnostic list was edited; no GitHub CI was used.
- **lead** (2026-10-01): Clean-code audit of SRP, DRY, naming, coupling, dead code, simplicity, boundaries and reachable failures found no scored violation. One effective-caller function removes the prior duplicated inference; ambiguous callers remain excluded. Biome, focused tests and TypeScript compile pass.
- **lead** (2026-10-01): The unmodified full local gate passed on exact clean `4fe805c6`: core 1080, all five models, schema and ESM checks, pages 1019 at 100% coverage and browser 430 passed/20 skipped. Astra's fourteenth review confirmed the #130 correction across 32 caller-reach cases and found separate timing defect #131; final signoff remains pending.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #130 (Sole inferred callers participate in invariant reach) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/130#issuecomment-5963177045.
