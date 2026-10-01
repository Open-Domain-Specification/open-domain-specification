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
