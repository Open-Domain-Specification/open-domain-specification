---
column: doing
labels: [core, model, bug]
priority: high
agent: lead
live: false
status: Source-aligned reach matrix and local audits passing; clean-head gate and signoff pending
progress: 94
clean-code-swept: true
updatedAt: 2026-10-01T11:48:00Z
---
# Timed invariants read facts each guarded call can reach

Issue #131. Astra's fourteenth review found that a front consuming a guarded operation made that operation's answer look fetched before it ran. Its fifteenth review found three adjacent routes through another named operation, a process ending event and a second local front. The owner requested a five-whys assessment of the review loop and backlog growth. These cases are one reach-semantics correction under the existing issue, with no three-ticket expansion.

## Checklist

- [x] Exclude the guarded operation's own consumption by identity from fetched facts
- [x] Regress fronted/unfronted aggregate and context rules, explicit/inferred caller, direct and JSON round-trip
- [x] Preserve a valid separate earlier query returning the same schema
- [x] A second named operation cannot lend the guarded call's future answer; a separate earlier query with the same schema still can
- [x] Process start-event payloads and immediate policy event/answer triggers are reachable; unordered process `on`, ending events and current-invocation future facts cannot supply a precondition; an already received prior occurrence retains its payload even when a new invocation can produce the same identity
- [x] Already-held answer and event facts follow two local fronts, stopping at ambiguous callers and the context boundary
- [x] Independent fronts, policy triggers and process starts cannot lend facts across routes; all-route positive twins retain valid reach, directly and after JSON round-trip
- [x] Shared Svelte invariant page describes fetched and heard facts truthfully; focused render test passes
- [x] Expand composed payloads before intersecting routes, and require request/answer/refusal reach at every named timed guard
- [x] Petstore's check-and-approve front now makes the availability read and guarded transition one causal chain; pinned diagnostics remain zero
- [x] Align schema, hand-written skill and tactical guide; regenerate reference outputs and pin their drift checks
- [x] Append decision 19 note and record the exact review result
- [x] Clean-code review of the expanded correction
- [ ] Full local landing gate on the clean committed head
- [ ] Exact-head independent signoff

## Journal

- **lead and core owner** (2026-10-01): The full gate passed on clean `c7b5a5ad`, but Astra's sixteenth review found an immediate policy payload removed because that event was future on another invocation. Future-event exclusions now follow each issued operation's route. Direct/round-trip positive and negative twins preserve the trigger while still requiring an independent front to fetch the fact. Adjacent external-contract corrections remain under signoff #108: every named operation/event must carry a postcondition shape, and external preconditions cannot borrow internal fetched facts. Core 1148 tests pass; hand-written and generated guidance is reconciled, focused reader tests and clean-code sweep pass. A new clean-head full gate and independent review remain.

- **lead** (2026-10-01): The focused timing matrix passes. The exclusion is by consumed operation, not schema, so another query may still supply the same shape. No pinned diagnostic list was edited and no GitHub CI was used.
- **lead** (2026-10-01): Clean-code audit across SRP, DRY, naming, coupling, dead code, simplicity, boundaries and reachable failures found no scored violation. The validator change is one identity guard; the timing fixture keeps the negative and same-shape positive adjacent. Biome and TypeScript compile pass.
- **lead** (2026-10-01): The first #131 correction passed the full local gate on clean `a40226e9` (core 1090, pages 1019 at 100% coverage, browser 430 passed/20 skipped), but Astra's fifteenth review found the three adjacent gaps above. The owner requested a five-whys assessment; the old patch-by-patch final-review loop stopped. The expanded issue body holds all cases. The new local matrix passes 40 focused cases and the full core and skill suites; generated guidance was built, not hand-edited. A fresh clean-code sweep and full gate remain.
- **lead** (2026-10-01): The expanded clean-code audit found no scored violation across SRP, DRY, naming, coupling, dead code, simplicity, boundaries or reachable failures. The backward local caller walk is cycle guarded and bounded by context; the dedicated process fact check intentionally excludes `ends` while subscription validation still sees it. The focused matrix now includes starting, waiting, ending and self-raised event payloads, two local fronts, ambiguous callers, multiple named operations and a distinct query of the same schema. Core and skill suites pass. Full gate remains.
- **tester and senior developer** (2026-10-01): A bounded audit found that one independent front's fetched answer satisfied another front's precondition. The same quantifier gap applied to alternative policy events and process starts. A failing-before regression was recorded first; route-aware reach then passed 542 validator-file tests, including negative and positive direct/JSON-round-trip twins. Biome and TypeScript compile passed. Decision 19 has an append-only note. The shared Svelte reader's false boundary-only sentence was corrected with focused render coverage. The full gate and exact-head review remain pending.
- **lead and delegated lanes** (2026-10-01): Clean-code and boundary re-audits exposed public direct entries, independent named guards, unordered process `on`, path-enumeration cost and composition-before-intersection. A bounded fixed-point calculation replaced recursive route enumeration. Direct/round-trip twins cover valid and invalid policy answer triggers, process starts, request and answer reach across several guarded operations, and composed Envelope/Fact payloads. Petstore's old process issued check and approval independently, so the new validator correctly found a diagnostic; the source model now wires one check-and-approve front without changing its pinned zero-diagnostic list. Decision 19 and 23 notes, schema, skill, docs and shared reader copy were reconciled. Core 1132 and skill 129 tests passed before the last postcondition twins; a new exact-head full gate remains.
- **lead** (2026-10-01): Final local suites before commit passed: core 1137, skill 137, Petstore 24 and shared pages 1020 with 100% coverage. Generated Petstore and all five schema copies were rebuilt from sources; pinned diagnostics stayed 0 / 2 / 4 / 3 / 0. The two re-audits found no concrete clean-code, boundary or panic blocker. A new clean committed head, its unmodified full gate and independent signoff remain.
- **lead and tester** (2026-10-01): The unmodified full gate on clean `ab8994f2` passed package, reference-model, schema and ESM checks plus 429 browser cases; one browser assertion still expected the old direct Petstore process-to-approval edge. The corrected source calls a check-and-approve front, then the aggregate transition. The E2E test now asserts both plain-arrow steps and the original dashed completion edge; its focused Playwright run passed. The full gate must run on the next clean commit before independent signoff.

- **lead and delegated lanes** (2026-10-01): The seventeenth review found an immediate prior policy answer excluded by operation identity and informed recursive callers stripped of facts by least-fixed-point initialization. Decision 19 first specified admitted finite routes and prior occurrences. Claude implemented the greatest must-fact solver with 58 new direct/JSON tests (core 1206 pass); the architect independently compared 2,500 finite-route results and found no integration blocker. Closed caller components, uninformed alternatives and declaration order have regressions. Guidance and generated schema/reference outputs are rebuilt, pinned model diagnostics unchanged, clean-code sweep clear. Full clean-head gate and final signoff remain, with no new issue or GitHub CI run.
