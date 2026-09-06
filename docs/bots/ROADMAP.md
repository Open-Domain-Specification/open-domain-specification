# Roadmap

Kept by the lead. Milestones in order, with why. Work items are RepoDoc cards under `boards/`; engineering decisions are records under `decisions/` (the repo's existing ADR stream, not a second one here).

## 1. Intent and evidence (shipped, 0.3.0)

Comments and dispositions on strategic intents; relationship pages; health report; map disclosure; skill reconciliation. RFC-002.

## 2. Design language v2 (shipped, 0.3.0 and 0.4.0)

Every page follows the VS Code UX guidelines; v1 removed; modal relationship detail; Playwright gates CI.

## 3. The metamodel survives external review (current; sprint 02 running)

Goal set by the human on 2026-09-06: an Antigravity analysis ("analyse the DDD domain model as defined by the project and try and foresee any issues with modeling systems using this specification") has no complaints. Baseline: sixteen issues. Answered by decisions 13 to 19 and cards 44 to 50. Loop: land, re-run, address until clean. Why: external review is the product's quality bar, and deliberate omissions must read as decisions, not gaps.

## 4. Modular workspaces (next)

Decision 08's `WorkspaceSet` was never implemented; extension card 07 covers it. Milestone 3 removes the cross-context and cross-file contradictions first so the loader lands on a consistent model.

## 5. Older extension cards

Extension cards 01, 02, 04, 06, 09 predate the team way of working and need scoping with the human before dispatch.
