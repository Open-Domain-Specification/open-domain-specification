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

## 5. Modular workspaces (later)

Decision 08's `WorkspaceSet` was never implemented; extension card 07 covers it. Model corrections and the diagram batch land first so the loader starts from a consistent base.

## 6. Older extension cards

Extension cards 01, 02, 04, 06, 09 predate the team way of working and need scoping with the human before dispatch.
