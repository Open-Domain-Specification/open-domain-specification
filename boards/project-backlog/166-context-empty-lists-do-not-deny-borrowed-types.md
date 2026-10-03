---
column: done
labels: [model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Context empty lists do not deny borrowed types

Issue #116. The seventh signoff round's OpenAI Astra low review reproduced a valid Cards context with no local value-object or schema declarations. Cards holds Ledger's Money and its operation carries Ledger's CardRequest over a shared kernel, yet the context page said every attribute was bare and no consumable carried a declared payload. The shared page serves the VS Code webview, static export and viewer.

## Checklist

- [x] Empty Value objects and Schemas lists say only that the context declares none locally
- [x] A zero-diagnostic borrowed Money/CardRequest fixture proves the copy before and after JSON round-trip
- [x] The lists still enumerate locally declared elements; borrowed uses remain visible on the holder or consumable page
- [x] Pinned model diagnostics and generated outputs are unchanged

## Gates

- [x] Focused ContextPage unit test and Svelte check
- [x] `bash scripts/verify-all.sh` passed on `a2cef010`: pages 1014, browser 430 passed/20 skipped, all model and generated checks green
- [x] Exact-head final signoff after the gate — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).
## Journal

- **lead** (2026-10-01): Issue #116 records the reader story. The lists are correctly local declarations; their old empty copy overclaimed what Cards can hold or carry. The replacement copy names local declarations, with a zero-diagnostic borrowed pair in the regression. No schema or validator rule changed.
- **lead** (2026-10-01): Clean-code pass: the declaration lists stay local; only their empty copy changes, and the test checks both valid borrowed uses before and after round-trip. No duplicate lookup or new branch was needed. Format and focused tests pass.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #116 (context empty states) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/116#issuecomment-5963170434.
