---
column: doing
labels: [frontend, docs]
priority: high
agent: lead
live: false
status: Baseline complete on 29048949; findings raised as #77 to #94, none blocking epic 61
progress: 100
updatedAt: 2026-09-29T22:54:29Z
---
# Designer baseline sweep of ODS

User-requested baseline across extension/shared pages: visual consistency, accessibility, interaction and error states. Findings become deduplicated RepoDoc tickets; no production fixes in this pass. Baseline SHA: 6ec06edc0aa6b1db920a4c962170a8f8ac83e92d; active WIP, not release certification.

## Checklist

- [x] the design reviewer visual and user-journey review of every page family, on the final code state (reopened 2026-09-29 by the owner's review of PR #76; done on 29048949: 107 screenshots opened by the designer, covering every family and state)
- [x] the accessibility reviewer accessibility and interaction review
- [x] Verify findings, deduplicate existing cards and raise tickets
- [x] Record tested coverage and limitations
- [x] Inventory of page families, global surfaces, interactions and the host, theme and viewport matrix (`docs/design/baseline/inventory.md`)
- [x] Capture harness (`packages/pages/e2e/baseline-capture.spec.ts`, gated behind `ODS_BASELINE=1`)
- [x] Final browser pass on the integrated head, with the tested commit recorded and browser, static-export and real-extension-host evidence kept distinct

## Comments

- **lead** (2026-09-05T16:15:19.566227+00:00): Coordinating review using docs/team/qa/README.md:1 and docs/bots/design/ (deleted 2026-09-07)manual-regression-review.md:1. Updated Fable Codex roles to Astra before dispatch; upstream generator tests 20/20 and typecheck pass.

- **lead** (2026-09-05T16:22:25.868670+00:00): Raised boards/vsc-extension/84-unsafe-markdown-link-schemes.md:1 and boards/vsc-extension/85-import-status-accessibility.md:1 from the accessibility reviewer findings; independently reproduced unsafe Markdown output. Baseline unit tests 13/13 and svelte-check 0 errors/0 warnings. Designer reports still in progress.

- **lead** (2026-09-05T16:30:56.598836+00:00): the accessibility reviewer report complete at docs/bots/design/ (deleted 2026-09-07)2026-09-05-the accessibility reviewer-baseline.md:1; parent reran the accessibility review (report deleted 2026-09-07)accessibility.probe.test.ts:1 (7/7). Raised distinct cards84–91; the optional health aria-controls suggestion is not treated as a confirmed bug. the design reviewer visual sweep remains active.

- **lead** (2026-09-05T17:08:02.807787+00:00): Eight distinct issues raised in cards84–91; existing fullscreen card14 and navigation card86 enriched with the design reviewer native observations. Remaining visual/AT coverage is explicit in boards/vsc-extension/92-complete-visual-baseline-coverage.md:1. Keeping this card incomplete; no human sign-off or completed full sweep implied.

- **developer** (2026-09-29T17:05:32+00:00): This card now tracks issue #53 under epic #61 (the design and accessibility sweep finished across a browser and every page family). The inventory is at docs/design/baseline/inventory.md and the capture harness is packages/pages/e2e/baseline-capture.spec.ts. The final browser pass on the integrated head is still to do.

- **developer** (2026-09-29T17:53:35+00:00): Final capture run on integrated head 464614f6 (Chromium 151, viewer, export-http, export-file; light and dark; 370 shots, 0 failed). Against 6469b16: landmark-unique 300 entries / 300 nodes to 0; empty-table-header 114/318, color-contrast 81/379, link-in-text-block 66/212 and heading-order 18/18 unchanged; 36 phone-width shots still overflow sideways, none at wider sizes. The file:// "blocked CSS XHR" message comes from axe-core, not the app. Evidence at docs/design/baseline/final-pass.md and docs/design/audit/464614f6/manifest.json. The final browser pass item stays open for designer review.

- **lead** (2026-09-29T19:29:09Z): The final browser pass ran on the integrated head 464614f6: 370 Playwright Chromium captures across the viewer, export-http and export-file, in light and dark, at 1300×900, 800×900, 390×844 and 1150×700 as the inventory sets out, with axe. `landmark-unique` fell from 300 to 0 (#50). The lead reviewed eight screenshots directly. Findings are in `docs/design/baseline/final-pass.md`, and nine separate defects are raised as #78 to #86, with #77 from the real-host journeys. None blocks epic 61. Real-host behaviour is covered by `apps/ods-vscode/e2e-keyboard/journeys.spec.ts`. No screen reader was run.
- **lead** (2026-09-29T21:21:07Z): Correction to the entry above. It called the final pass complete, but the visual review opened eight screenshots, and most page families were never looked at. The owner's review of PR #76 reopened it. The captures, the axe counts and issues #77 to #86 stand. Still to do: a visual review of every required page family and the relevant interaction states, on the final code state after the #48 and #50 fixes, recording host, theme, viewport and findings for each.
- **lead** (2026-09-29T22:00:57Z): The page-family review is done on the final code state, 290489491d7fcb27395bfa4054742dc4a71c8ee9, the head carrying the #48 and #50 review fixes.
  - Captures: 370 shots with axe (`docs/design/audit/29048949/manifest.json`).
  - Review: the designer opened 107 screenshots, recorded in `docs/design/baseline/final-pass-2.md`. Every one of the 24 page ids was seen at viewer/light/1300, export-http/dark/1300, and one 800 or 390 shot. All nine states were seen in both themes, with export-file spot checks.
  - Findings: nothing blocks the epic. Seven new defects are raised as #87 to #93, and two polish items as #94; the earlier issues #77 to #86 were seen again.
  - Not covered: screen readers, VS Code high contrast, `forced-colors`, and the webview's appearance. The webview's behaviour is covered by the Playwright-Electron journeys.
- **lead** (2026-09-29T22:54:29Z): Re-verified after the owner's review fixes, on b461666c574cb3bf3475a97d6fd3d3578d539e93. The landing gate ran 22:48:52–22:52:07Z: pages 986 at 100% coverage, pages e2e 395 passed and 20 skipped (the gated capture harness), every model suite at its pinned count, schema comparison match. `npm run test:vscode:keyboard` in real VS Code 1.96.4 passed 21 of 21 on three consecutive runs, and `npm run test:vscode` passed (9 passing, 4 pending screenshots; hostile-links 1; cross-surface 4), on the same head. The card stays in `doing` until PR #76 merges.
