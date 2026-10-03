---
column: done
labels: [model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Detail pages name attribute rules

Issue #120. On exact head `a2cef010`, Claude Opus 5.5 high found NorthBank Account, PaymentInstruction and RiverMart Order entity pages saying no invariant names them. Valid aggregate and context rules name their attributes, rather than the entity itself. The common lookup also feeds value-object detail pages and must include inherited attributes on kinds.

## Checklist

- [x] Shared lookup finds rules naming an element or one of its declared or inherited attributes, once and in workspace order
- [x] NorthBank Account and PaymentInstruction rule rows and keepers render before and after JSON round-trip
- [x] An entity kind's inherited attribute and a borrowed value's attribute appear under the correct rule owner
- [x] Detail-page copy and root tooltip make only claims their rows establish
- [x] Pinned diagnostics and generated outputs remain consistent

## Gates

- [x] Focused entity/value-object tests and Svelte check
- [x] `bash scripts/verify-all.sh` passed on `5bb730fa`: doc 51, pages 1017 with 100% coverage, browser 430 passed/20 skipped, all model/schema/import checks green
- [x] Exact-head independent final signoff — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).
## Journal

- **lead** (2026-10-01): Issue #120 records the reader story. The shared leaf lookup now tests each rule target against the element and its `allAttributes`; the latter includes inherited attributes. It preserves direct target identity, does not infer that a rule on a held value applies to every entity, and leaves the aggregate/context owner column intact. Focused NorthBank and synthetic kind tests pass.
- **lead** (2026-10-01): Clean-code pass: one lookup serves both detail pages; a set of the target's attributes avoids repeated hierarchy walks, and the template retains presentation only. No duplicate rule branch or unsafe product lookup remains.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #120 (rules on entity/value attributes) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/120#issuecomment-5963172305.
