# ODS backlog delivery roadmap

## Current position (2026-10-02)

The owner accepted the guarded ten-milestone plan. The operative ledger is [delivery/manifest.json](delivery/manifest.json); entry/exit criteria, scope boundaries, investigation limits and restart/journal protocol are [delivery/CONTROLS.md](delivery/CONTROLS.md). Lead owns enforcement.

Current: 54 open, zero closures, milestone 1 / PR #132 active. The archived d7 candidate passed gate and actual hosts, but the CLI review was interrupted without a verdict. The documentation-only controls addition needs a fresh clean-head gate before review. Later milestones wait for model landing; actual closure counts replace forecasts.

| Milestone | Issues | Expected remaining | State |
| --- | --- | ---: | --- |
| 1. Finalise and land the model | #107, #108, #109, #110, #111, #112, #113, #114, #115, #116, #117, #118, #119, #120, #121, #122, #123, #124, #125, #126, #127, #128, #129, #130, #131 | 29 | active: approval/landing |
| 2. Resolve the model proposals | #35, #36, #37, #38, #39, #40, #64, #65 | 21 | waiting |
| 3. Diagrams and reliable drag checks | #102, #86, #89, #90, #103 | 16 | waiting |
| 4. Readable tables | #105, #87, #88, #80 | 12 | waiting |
| 5. Accessible reading | #78, #79, #83 | 9 | waiting |
| 6. Location and return paths | #91, #77 | 7 | waiting |
| 7. Phone reading | #82 | 6 | waiting |
| 8. Import and copy finish | #92, #93, #94 | 3 | waiting |
| 9. Team-owned model files | #59 | 2 | waiting |
| 10. Informed forms and authoring epic | #54, #63 | 0 | waiting |

## Historical roadmap and retrospective records

The following dated snapshots are retained as history; the current ledger above supersedes their readiness/count claims.

# Roadmap

Kept by the lead. Milestones in order, with why. Work items are RepoDoc cards under `boards/`; engineering decisions are records under `decisions/` (the repo's existing ADR stream, not a second one here).

## Current delivery sequence (2026-10-01)

Epics #96, #100 and #98 landed in sprint 03. The owner now puts model finality and independent signoff ahead of tooling. [Sprint 04](sprints/2026-10-01-sprint-04.md) integrates the model corrections on `codex/model-fidelity-northbank`, proves the validator's timing and causal reach across all four readers, runs the full local gate and requests one final exact-head Astra low review followed by Claude Opus 5.5 high only after local readiness. The model PR then lands on `develop` and closes its covered stories. Parked diagram PR #106 resumes only after that signoff and landing. The identity and reference-heavy capability epics #63 to #65 remain later and must not run together.

## 1. Intent and evidence (shipped, 0.3.0)

Comments and dispositions on strategic intents; relationship pages; health report; map disclosure; skill reconciliation. RFC-002.

## 2. Design language v2 (shipped, 0.3.0 and 0.4.0)

Every page follows the VS Code UX guidelines; v1 removed; modal relationship detail; Playwright gates CI.

## 3. The metamodel survives external review (current; sprint 04)

Goal set by the human on 2026-09-06: the model gives a correct, clean and detailed account of software systems the DDD way. Sprint 02 established the decisions and five reference models. Sprint 04 closes the accumulated model corrections as one locally verified batch, then seeks independent approval on one exact head and lands it. Review blockers return to a bounded local causal audit before another final review. Why: the model and its four readers must agree, and deliberate omissions must read as decisions with testable reopening conditions.

## 4. Diagram tooling and parked PR #106 (after model landing)

Rebase and verify PR #106 against the landed model. Review its integration diff, run the full local gate and real VS Code checks before landing. Only then begin another small tooling batch.

## 5. Finish bounded reader outcomes (after diagram landing)

Land one package before starting the next, with at most two implementation stories and one bounded audit active. First epic #105 with #87, #88 and #80: readable glossary and attribute columns, intact type tokens and an accessible identity header. Then #78, #79 and #83: readable contrast, recognizable prose links and a keyboard path past navigation and diagrams. Then #91 and #77: keep the current tree location visible and provide a return path inside the extension. Define the input and host matrix before implementation, capture the current baseline, and verify viewer, static export and the real extension where host behavior matters; Markdown must still tell the same model truth.

Keep phone navigation #82 separate because its layout needs an explicit design across page families. Viewer import refinements #92–#93, exact copy #94 and drag-check reliability #103 retain their own acceptance. Fix a reproduced unreliable landing gate under #103 rather than accepting reruns as stability evidence.

Measure merged issue closures, new/reopened issues, first-review acceptance and gate/CI cost at each delivery boundary; perform a five-whys assessment after a blocked final review and a daily retrospective. The observed 54-open baseline includes 25 model issues. Closing all 25 after verified model landing would leave 29; diagram landing would close four more. These counts are conditional, not closure evidence.

## 6. Modular workspaces (later)

Decision 08's `WorkspaceSet` was never implemented; extension card 07 covers it. Model corrections and bounded reader batches land first so the loader starts from a consistent base. In epic #63, resolve multi-file identity, ownership and references under #59 before workspace-aware forms #54. Reopen capability proposals #35–#40 only on their recorded source-backed conditions; do not dispatch the overlapping epics #63–#65 together.

## 7. Older extension cards

Extension cards 01, 02, 04, 06, 09 predate the team way of working and need scoping with the human before dispatch.

## Delivery retrospective after the twenty-second blocked model review

Observed on 2026-10-01: 54 open issues, 25 model stories awaiting one merged signoff batch, zero merged model closures. The green gate on `39a33ad3` preceded a reproduced loss of a process ending in the flow projection. A bounded local audit then found two distinct local/borrowed refusal schemas serialized as one answer reference. Both source and reconstructed models validated with zero diagnostics. Neither the old gate nor diagnostic absence establishes a lossless model round trip.

Five whys: final review found a missing semantic combination; the gate passed because that combination was absent from its cases; local matrices followed the latest helper/path rather than the whole input-to-reader contract; final signoff became the integration probe; a large unmerged batch accumulated review evidence without accepted closures. The first three are supported by concrete regressions; the last two are process inferences, and will be tested by the next delivery outcomes.

Owned controls for the next checkpoint:

- **Lead:** declare one bounded contract matrix before signoff: authored input and JSON, equal local/display ids with different full identities, actual route ownership, lifecycle role, duplicate controls, validator result and every affected reader. A bounded independent audit checks its missing axes; it finishes before the full gate and final reviewers.
- **Integration lead:** keep one current evidence block with local candidate, clean/dirty state, gate head/result, reviewer head/verdict and remote PR head. Historical evidence stays in journals. Source changes invalidate current gate and approval claims.
- **Delivery lead:** finish PR #132, verify the actual merged diff against each of the 25 acceptance-ledger rows, and close only proven stories. Then land PR #106 before opening the next reader package. Keep the two-implementation/one-audit work limit and use existing tickets for adjacent corrections.
- **Lead:** after a blocker, record its omitted axis and one owned process correction; verify that correction at the next checkpoint. Report merged-and-accepted closures, new/reopened issues, net burn-down, first-review acceptance and local/remote verification cost. Do not count tests, review rounds or conditional closure forecasts as shipped work.

These controls serve model trust now and the plugin later: `WorkspaceSet` and forms will need the same lossless identity/reference contract. They do not approve the current candidate or replace the mandatory landing gate.

## Twenty-third review correction (2026-10-01T20:52:23Z)

The existing model package now includes a complete reference identity contract, because ambiguous canonical refs changed an answer silently through JSON. Core, readers and guidance are delegated as three disjoint subsets; the lead integrates them against a finite producer-to-reader identity matrix. This supports the model now and multi-file authoring later without beginning plugin tooling. A separate iterative shared flow walk already passes its bounded source/JSON scale and ordering cases. No new backlog ticket is needed. The owner’s Claude-quota fallback uses SOL coding and OpenAI-only final approval until the quota resets. Current outcome remains zero merged model closures; implementation evidence does not count as burn-down.

Model checkpoint 2026-10-01T22:21:03Z: final24 BLOCK on ad6 after fullgate. Existing108 now covers complete shared-language separation intersections and bounded malformed-ref structural resolution. Two disjoint SOL lanes; model-first priority unchanged, no new backlog/CI/tooling start. Next final25 only after full class proofs and clean gate.

## Final24 integration readiness (2026-10-01T22:36:01Z)

Both final24 correction classes are integrated. Root full-core suite passes 1,568/1,568; independent reviewer artifacts now report one exact separate-ways diagnostic each, and the 78,029-character malformed external ref loads with one unresolved-ref and survives serialization unchanged. New 21-case borrowing matrix proves source/JSON exact negatives, fully clean permitted twins and permission contradictions; two resolver regressions prove short/deep invalid structures without recursion. All eight scoped quality reports /tmp/ods-final24-quality-*.md are clear by static inspection, read and reconciled by lead; no introduced finding above0.5. Core/graphviz/doc/skill and all five reference outputs/fixture regenerated; skill154, allfive48/shared13 and Biome/diff pass. Reference pins unchanged0/2/4/3/0; no pin or DISCOVERY edits. Card exits doing to review with clean-code-swept true. Fresh actualhosts, unmodified clean committed-head whole gate and final25 remain pending; old ad6 evidence is historical. Zero closures/newtickets/CI.
