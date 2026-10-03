---
column: done
labels: [model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Value-object invariants have construction timing only

Issue #124. Both tenth-round reviewers reproduced a standard's value-object invariant carrying `precondition`, `postcondition`, or both with zero diagnostics. A value rule is true by construction. Svelte then called it a guardless precondition while Markdown called it a value rule.

## Checklist

- [x] `invariant-in-value-object` rejects either timing flag in modelled and external contexts; call-timing rules keep their existing validator path
- [x] Focused tests cover each flag combination, the valid unflagged twin, and JSON round-trip
- [x] Decision 27/28 notes, rule catalog, skill and tactical guidance state construction-only timing
- [x] Generated references and all model schema copies rebuilt; pinned diagnostics unchanged
- [x] Full local gate and exact-head independent signoff — Passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0); merged tree `6efd1aa35bae524dfce9345210096caeafcef236` matches the reviewed tree. This is product-candidate evidence, not a gate rerun on this metadata update. The exact-head review also received OpenAI Astra low APPROVE under the owner-authorized OpenAI-only exception; no Claude approval is claimed.

## Gates

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).

## Journal

- **lead** (2026-10-01): The focused validator cases pass. The rule is checked by value ownership, so an external context cannot bypass it.

- **lead** (2026-10-01): Clean-code audit found one rule owning construction timing and a separate call-timing iterator, with no duplicate timing error in modelled contexts. Generated references and all schema copies were rebuilt, and drift checks pass. No high-scored marker remains.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #124 (Value rules are construction-time) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/124#issuecomment-5963174356.
