---
column: done
labels: [model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# An external event cannot be a precondition target

Issue #127. Astra's eleventh exact-head review reproduced a precondition targeting an external context's operation and event together with zero diagnostics. Event-only preconditions were already rejected; the mixed case then reached Markdown under a false “Checked before” claim.

## Checklist

- [x] Exclude event targets from external precondition reach, even beside an operation
- [x] Focused direct and JSON-round-trip cases cover operation-only precondition, mixed precondition and mixed postcondition; event-only case remains rejected
- [x] Decision 28 records the corrected boundary
- [x] Clean-code review and full local gate — Passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0); merged tree `6efd1aa35bae524dfce9345210096caeafcef236` matches the reviewed tree. This is product-candidate evidence, not a gate rerun on this metadata update.
- [x] Exact-head independent signoff — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

## Gates

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).

## Journal

- **lead** (2026-10-01): A local event target now receives an explicit diagnostic explaining that it has no request and can only be named by a postcondition. The existing event-only fixture now reports that target alongside its missing guard and out-of-reach payload; focused tests pass.
- **lead** (2026-10-01): Full validator suite (491), core typecheck and formatter pass. Clean-code pass found no scored violation: the same reach set drives target diagnostics, the explicit event message is limited to this context's preconditions, and the other contract target cases retain their prior behavior.
- **lead** (2026-10-01): The first full local gate passed on clean `42365fe1` (core 1065, pages 1019 at 100% coverage, browser 430 passed/20 skipped and all other checks). Before review I expanded the event-only case through JSON round-trip in the four-case matrix; its focused test passes, and the full gate will run again on the amended head.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #127 (External precondition rejects an event beside an operation) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/127#issuecomment-5963175636.
