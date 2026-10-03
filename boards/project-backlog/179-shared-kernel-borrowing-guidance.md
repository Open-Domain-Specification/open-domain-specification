---
column: done
labels: [docs, model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Guidance says a shared kernel borrows both ways

Issue #129. Astra's twelfth exact-head review found the hand-written authoring skill and generated `schema-context` reference saying all three borrowing routes run downstream only. The validator, decision 16 and strategic docs correctly make shared-kernel borrowing symmetric.

## Checklist

- [x] Correct the hand-written skill and rule-catalogue source; regenerate the validation reference
- [x] Reciprocal schema, value and value-kind fixture validates directly and after JSON round-trip
- [x] Drift test pins the distinction and bans the false blanket sentence
- [x] Decision 16 note records the guidance correction
- [x] Clean-code review and full local gate — Passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0); merged tree `6efd1aa35bae524dfce9345210096caeafcef236` matches the reviewed tree. This is product-candidate evidence, not a gate rerun on this metadata update.
- [x] Exact-head independent signoff — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

## Gates

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).

## Journal

- **lead** (2026-10-01): The reciprocal borrowing fixture and 65 focused drift tests pass. The reference was regenerated from core; no generated file was hand-edited.
- **lead** (2026-10-01): Clean-code audit found no scored violation: the one-way condition remains in the directed relationship routes and the generated reference is downstream of the rule catalogue. The reciprocal fixture uses a valid domain/subdomain and asserts zero diagnostics on both forms.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #129 (Shared-kernel borrowing is symmetric) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/129#issuecomment-5963176561.
