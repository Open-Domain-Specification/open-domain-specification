---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Focused correction passing; full local gate and signoff pending
progress: 75
clean-code-swept: true
updatedAt: 2026-10-01T07:25:00Z
---
# A modelled rule names operations, not events, as guards

Issue #128. Astra's twelfth exact-head review found a context or aggregate precondition with both Capture and Captured validating clean and reading as though Captured were an operation checked before it ran. The same mixed-event hole existed for a modelled postcondition and an unflagged rule. Decision 19 permits an already-heard event's payload attributes, while decision 28 separately permits an external context's published event guarantee.

## Checklist

- [x] Reject event targets on every modelled aggregate and context rule, including mixed operation/event targets
- [x] Direct and JSON-round-trip tests cover both owners, all three timings, operation-only positive and event-only/mixed negatives
- [x] Preserve the valid heard-payload and external postcondition cases
- [x] Rule catalogue and decision 19/27 notes state the boundary; generated reference rebuilt
- [ ] Clean-code review and full local gate
- [ ] Exact-head independent signoff

## Journal

- **lead** (2026-10-01): One `invariant-guards-are-operations` rule now checks every modelled invariant, including unflagged aggregate and context rules that had the same reader lie. Focused source tests reject each event target; the extant heard-payload and external-contract regressions are still part of the full gate.
- **lead** (2026-10-01): The first full local gate passed on `716d6989` (core 1067, skill 93, pages 1019 at 100% coverage, browser 430 passed/20 skipped). A final source check found the unflagged variant, so the guard validation was consolidated into one rule and the matrix expanded; the gate must repeat on the amended head. The clean-code audit across SRP, DRY, naming, coupling, dead code, KISS, boundaries and panic safety found no scored violation in the common rule; tests assert complete zero-diagnostic positives and only the expected errors in negatives.
- **lead** (2026-10-01): The first full gate of the consolidated rule stopped at core's required catalogue coverage: every rule needs a family and a positive/negative pair. The new rule is now classified in the invariants family, represented by a nearest-valid pair, and fired in the all-rules fixture; the three focused catalogue suites pass. The full gate must run again on a clean head.
- **lead** (2026-10-01): The second full gate passed core (1069) and stopped at the documentation site's hand-written rule table, which requires every catalogue id. The validation page now names the new rule and its external event exception; its table test and a guidance drift assertion will be checked before the next gate.
