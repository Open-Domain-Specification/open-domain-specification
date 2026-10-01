---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Validator correction implemented; full gate and signoff pending
progress: 75
clean-code-swept: true
updatedAt: 2026-10-01T06:25:00Z
---
# An external event cannot be a precondition target

Issue #127. Astra's eleventh exact-head review reproduced a precondition targeting an external context's operation and event together with zero diagnostics. Event-only preconditions were already rejected; the mixed case then reached Markdown under a false “Checked before” claim.

## Checklist

- [x] Exclude event targets from external precondition reach, even beside an operation
- [x] Focused direct and JSON-round-trip cases cover operation-only precondition, mixed precondition and mixed postcondition; event-only case remains rejected
- [x] Decision 28 records the corrected boundary
- [ ] Clean-code review and full local gate
- [ ] Exact-head independent signoff

## Journal

- **lead** (2026-10-01): A local event target now receives an explicit diagnostic explaining that it has no request and can only be named by a postcondition. The existing event-only fixture now reports that target alongside its missing guard and out-of-reach payload; focused tests pass.
- **lead** (2026-10-01): Full validator suite (491), core typecheck and formatter pass. Clean-code pass found no scored violation: the same reach set drives target diagnostics, the explicit event message is limited to this context's preconditions, and the other contract target cases retain their prior behavior.
- **lead** (2026-10-01): The first full local gate passed on clean `42365fe1` (core 1065, pages 1019 at 100% coverage, browser 430 passed/20 skipped and all other checks). Before review I expanded the event-only case through JSON round-trip in the four-case matrix; its focused test passes, and the full gate will run again on the amended head.
