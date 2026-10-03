---
column: done
labels: [model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# A modelled rule names operations, not events, as guards

Issue #128. Astra's twelfth exact-head review found a context or aggregate precondition with both Capture and Captured validating clean and reading as though Captured were an operation checked before it ran. The same mixed-event hole existed for a modelled postcondition and an unflagged rule. Decision 19 permits an already-heard event's payload attributes, while decision 28 separately permits an external context's published event guarantee.

## Checklist

- [x] Reject event targets on every modelled aggregate and context rule, including mixed operation/event targets
- [x] Direct and JSON-round-trip tests cover both owners, all three timings, operation-only positive and event-only/mixed negatives
- [x] Preserve the valid heard-payload and external postcondition cases
- [x] Rule catalogue and decision 19/27 notes state the boundary; generated reference rebuilt
- [x] Clean-code review and full local gate — Passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0); merged tree `6efd1aa35bae524dfce9345210096caeafcef236` matches the reviewed tree. This is product-candidate evidence, not a gate rerun on this metadata update.
- [x] Exact-head independent signoff — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

## Gates

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).

## Journal

- **lead** (2026-10-01): One `invariant-guards-are-operations` rule now checks every modelled invariant, including unflagged aggregate and context rules that had the same reader lie. Focused source tests reject each event target; the extant heard-payload and external-contract regressions are still part of the full gate.
- **lead** (2026-10-01): The first full local gate passed on `716d6989` (core 1067, skill 93, pages 1019 at 100% coverage, browser 430 passed/20 skipped). A final source check found the unflagged variant, so the guard validation was consolidated into one rule and the matrix expanded; the gate must repeat on the amended head. The clean-code audit across SRP, DRY, naming, coupling, dead code, KISS, boundaries and panic safety found no scored violation in the common rule; tests assert complete zero-diagnostic positives and only the expected errors in negatives.
- **lead** (2026-10-01): The first full gate of the consolidated rule stopped at core's required catalogue coverage: every rule needs a family and a positive/negative pair. The new rule is now classified in the invariants family, represented by a nearest-valid pair, and fired in the all-rules fixture; the three focused catalogue suites pass. The full gate must run again on a clean head.
- **lead** (2026-10-01): The second full gate passed core (1069) and stopped at the documentation site's hand-written rule table, which requires every catalogue id. The validation page now names the new rule and its external event exception; its table test and a guidance drift assertion will be checked before the next gate.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #128 (Modelled event guards) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/128#issuecomment-5963176065.
