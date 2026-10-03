---
column: done
labels: [model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Entity pages name cross-aggregate references and context rules

Issue #117. The seventh signoff round's Claude Opus 5.5 high review reproduced two old reader lies. Petstore's Shipment references Carrier across aggregates, while Carrier's entity page said nothing points at it. NorthBank's Lending context invariant `OneOpenApplicationPerCustomer` names LoanApplication, while that entity page said no invariant names it and ascribed every listed rule to the root. Markdown and the context page already name those facts.

## Checklist

- [x] Incoming scans direct relations naming the entity across every workspace aggregate and value object, including inherited source relations, and says the source's aggregate or context
- [x] Constrained by scans aggregate and context invariants naming the entity and shows which boundary keeps each rule
- [x] Petstore Carrier and NorthBank LoanApplication regressions render before and after JSON round-trip with working links and no false empty claims
- [x] A zero-diagnostic kind fixture checks inherited outgoing and incoming relation readings
- [x] Pinned model diagnostics and generated outputs are unchanged

## Gates

- [x] Focused EntityPage tests and Svelte check
- [x] `bash scripts/verify-all.sh` passed on `a2cef010`: pages 1014, browser 430 passed/20 skipped, all model and generated checks green
- [x] Exact-head final signoff after the gate — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).
## Journal

- **lead** (2026-10-01): Issue #117 records the reader story. The old incoming lookup stopped at the entity's aggregate; the rule lookup stopped at aggregate rules. The shared Svelte page now reads direct incoming relations and rules throughout the workspace, and the optional Kept by column distinguishes aggregate and context invariants. Its empty relation state says direct, leaving parent-typed possible references to the broader model. The three focused cases pass. No schema or validator rule changed.
- **lead** (2026-10-01): Clean-code pass: workspace lookups live once in the pages leaf module, the entity page only formats their result, and the invariant table shares its existing optional owner column. The loops are finite and preserve workspace order; no unchecked product lookup or high-scored clean-code finding remains. Focused tests, Svelte check and format pass.
- **lead** (2026-10-01): The eighth Opus review confirmed direct entity and context rule fixes but found the adjacent attribute-target omission. Issue #120/card 170 corrects that reach in the shared lookup; this card's direct-target claim remains true.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #117 (entity incoming references and context rules) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/117#issuecomment-5963170888.
