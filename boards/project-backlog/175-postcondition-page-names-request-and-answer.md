---
column: done
labels: [model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Aggregate postcondition page names request and answer

Issue #125. On exact head `edee33cb`, OpenAI Astra low rendered a valid aggregate postcondition relating a request deadline to the answer's arrival. Its detail page claimed every constrained field came from the answer or refusal. The same Svelte page serves the extension, static export and viewer.

## Checklist

- [x] Postcondition detail copy describes request, answer/refusal and applicable model elements without excluding valid targets
- [x] Adjacent unflagged aggregate and context precondition copy is scoped to the validator's reach
- [x] Focused Svelte test renders request and answer fields before and after JSON round-trip with zero errors
- [x] Full local gate and exact-head independent signoff — Passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0); merged tree `6efd1aa35bae524dfce9345210096caeafcef236` matches the reviewed tree. This is product-candidate evidence, not a gate rerun on this metadata update. The exact-head review also received OpenAI Astra low APPROVE under the owner-authorized OpenAI-only exception; no Claude approval is claimed.

## Gates

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).

## Journal

- **lead** (2026-10-01): The focused component test passes. It proves the renderer lists both fields under the corrected sentence.

- **lead** (2026-10-01): Clean-code audit found the wording change local to the shared page. The focused rendering, Svelte check and pages coverage pass. No high-scored marker remains.
- **lead** (2026-10-01): Before re-review, a copy scan found two adjacent overclaims: a precondition was described as becoming false after its call, and a context check's lead omitted an event payload its issuing reactor already heard. The Svelte page, core comments, validator guidance, tactical page and decision 27 now state the narrower promise; an existing context-page regression asserts the reactor case. Generated references and the exact-head gate are being refreshed.

- **lead** (2026-10-01): The last source sweep removed an absolute claim that an answer is never saved from the DSL comment and interview guide. The model only guarantees the answer at response time. Drift tests now cover schema, generated reference, DSL and interview copy; 62 drift checks and the focused page checks pass. No high-scored clean-code marker remains.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #125 (Postcondition page names request and answer) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/125#issuecomment-5963174824.
