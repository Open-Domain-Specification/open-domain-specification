---
column: done
labels: [model, bug]
priority: medium
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Detail pages show inherited relations and narrow empty claims

Issue #118. While correcting issues #116 and #117, the lead audited the other local-only lists. Decision 22 says an entity or value-object kind has its parent's relations, but its detail page showed only locally declared ones. Several aggregate and operation empty sentences inferred facts their lists cannot establish: a borrower-free value list was phrased as if every value were local; no aggregate event was said to prevent all outside knowledge; no policy issuer was said to imply a user or application service even when a process issues the operation.

## Checklist

- [x] Entity and value-object kind detail pages show inherited relations with `from <parent>`; a target's incoming list identifies the inheriting source too
- [x] Aggregate structure and empty states say what is held or provided, including borrowed values, without denying other communications
- [x] An operation with no issuing policy makes no claim about its other callers
- [x] A caller with no consumptions says it consumes no consumables, while its borrowing dependencies remain possible; the empty flow diagram is scoped to consumable flow
- [x] Focused entity-kind and value-kind tests, and updated empty-state assertions
- [x] Value-object direct attribute list says it reads declared attributes; the broader context list covers inherited uses
- [x] A borrowed value's detail page includes a context invariant that names it, showing the context once as keeper
- [x] Pinned model diagnostics and generated outputs are unchanged

## Gates

- [x] Focused page tests and Svelte check
- [x] `bash scripts/verify-all.sh` passed on `a2cef010`: pages 1014, browser 430 passed/20 skipped, all model and generated checks green
- [x] Exact-head final signoff after the gate — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).
## Journal

- **lead** (2026-10-01): Issue #118 records the additional reader story. `allRelations` already held the inherited facts in core; the detail pages had read only `relations`. They now show the inherited rows with their declaring parent. The copy corrections narrow the claims to what the local lists actually establish. No schema or validator rule changed; the workspace comment for `ValueObject.specialises` now lists the three permitted borrowing routes.
- **lead** (2026-10-01): The local-only audit also found that an empty consumptions table said its caller depended on nothing outside itself, which is false when it borrows a value. The shared table and both empty flow diagrams now speak only about consumables; the service lead covers events as well as operations. Clean-code pass found no duplicate rule logic, dead path or unsafe product lookup. Focused tests, Svelte check and format pass.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #118 (inherited relations and narrow empty claims) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/118#issuecomment-5963171297.
