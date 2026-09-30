---
column: doing
labels: [accessibility]
priority: medium
agent: developer
live: false
updatedAt: 2026-09-30T09:40:27Z
---
# An import says what it is doing

Issue #45, a child of epic #61. The viewer's import screen changed visually while a workspace loaded and when a load failed, and nothing was announced to assistive technology; the failure text was also whatever the runtime threw (`Cannot read properties of undefined`), which says nothing about what to do. Loading is now announced through a polite live region and each failure through an alert, and every failure names its cause and the next step. The import screen exists only in the viewer: the static export and the VS Code webview are handed a workspace and never draw it.

## Checklist

- [x] A Playwright test that fails on the old screen: real Load click and file input, asserting a live region that is in the page before its text arrives (`packages/pages/e2e/import-announcements.spec.ts`, 7 tests, all failing before the change)
- [x] `role="status"` region carries the loading text; `role="alert"` region carries the failure; both are always rendered so the text arrives as a change
- [x] Messages by cause: unreachable url, http status, a url that is not JSON, a file that is not JSON, JSON that is not a workspace (fails the schema); each ends in the next step
- [x] Unit tests for each message and for the status region in `packages/pages/src/app/ImportScreen.test.ts`
- [x] Pages stays at its 100% coverage threshold

## Gates

- [x] biome check on the touched files
- [x] `bash scripts/verify-all.sh` on 54b75e3f (lead): the gate ran 20:44–20:48Z, core 1040, pages 978 at 100% coverage, pages e2e 389 passed and 20 skipped (the gated capture harness), every model suite at its pinned count, schema comparison match; CI green on the same head
- [x] real VS Code host check (lead): `npm run test:vscode:keyboard` 19 passed and `npm run test:vscode` green (9 passing, 4 pending screenshots; hostile-links 1; cross-surface 4), both on 54b75e3f in real VS Code 1.96.4

## Comments

- **developer** (2026-09-29T16:31:00.000Z): Regions are `packages/pages/src/app/ImportScreen.svelte:142-143`, empty when idle. Messages are built in `fromUrl` (`:43-80`), `open` (`:83-91`) and `fromFile` (`:93-108`). A fetch rejection is reported as unreachable with the cross-origin hint, because the browser gives no reason a script may read. Raw runtime text is dropped from the not-a-workspace message on purpose: `Cannot read properties of undefined (reading 'replace')` is not something a reader can act on. Decision: the policy is one polite status line for loading and one atomic alert for failure, never both at once, and a new load clears the alert. The success path announces nothing here; the page that replaces the screen is #46's concern.
- **developer** (2026-09-29T16:55:00.000Z): The design record states the status and alert regions and the message pattern, cause then next step (`docs/design/design-language-v2.md`, section 2). Focus after a successful import is card 146's.
- **developer** (2026-09-29T17:23:44.000Z): Real VS Code host: not applicable. The webview is only ever handed a model by the host (`model`), it never draws the import screen, so there is no URL field, upload or example card to announce. Confirmed in the real webview by `apps/ods-vscode/e2e-keyboard/journeys.spec.ts` (`npm run test:vscode:keyboard`, real VS Code 1.96.4 driven by Playwright-Electron: real key and pointer events at the workbench, the webview's DOM only read; one launch per describe): test `#45 ... not applicable` finds no import screen, no file input and no URL field on the opened page.
- **lead** (2026-09-29T20:49:19Z): Gate green on 54b75e3f (lead): the gate ran 20:44–20:48Z, core 1040, pages 978 at 100% coverage, pages e2e 389 passed and 20 skipped (the gated capture harness), every model suite at its pinned count, schema comparison match; CI green on the same head. Real host: `npm run test:vscode:keyboard` 19 passed and `npm run test:vscode` green (9 passing, 4 pending screenshots; hostile-links 1; cross-surface 4), both on 54b75e3f in real VS Code 1.96.4. The card stays in `doing` until PR #76 merges.
- **lead** (2026-09-29T22:54:29Z): Re-verified after the owner's review fixes, on b461666c574cb3bf3475a97d6fd3d3578d539e93. The landing gate ran 22:48:52–22:52:07Z: pages 986 at 100% coverage, pages e2e 395 passed and 20 skipped (the gated capture harness), every model suite at its pinned count, schema comparison match. `npm run test:vscode:keyboard` in real VS Code 1.96.4 passed 21 of 21 on three consecutive runs, and `npm run test:vscode` passed (9 passing, 4 pending screenshots; hostile-links 1; cross-surface 4), on the same head. The card stays in `doing` until PR #76 merges.
- **lead** (2026-09-30T01:36:38Z): Re-verified after the owner's second review, on cbcafac34910ceb4499471eab15d75f045c3553f; the last commit that changes code is 1672315f, and the last that changes product code is 4d658b37. The landing gate ran 01:29:56–01:33:28Z: pages 992 at 100% coverage, pages e2e 404 passed and 20 skipped (the gated capture harness), every model suite at its pinned count, schema comparison match. `npm run test:vscode:keyboard` in real VS Code 1.96.4 passed 22 of 22 on three consecutive runs, and `npm run test:vscode` passed (9 passing, 4 pending screenshots; hostile-links 1; cross-surface 4), on the same head. The card stays in `doing` until PR #76 merges and post-merge CI succeeds.
- **lead** (2026-09-30T09:40:27Z): Re-verified after the owner's third review, on cac9ac6f0aa0f41e54e10fa2cc8655973d19ee25; the last commit that changes code is 872acc32, and the last that changes product source is 5d378790. The landing gate ran 09:35:55–09:38:03Z: pages 994 at 100% coverage, pages e2e 408 passed and 20 skipped (the gated capture harness), every model suite at its pinned count, schema comparison match. `npm run test:vscode:keyboard` in real VS Code 1.96.4 passed 23 of 23 on three consecutive runs, and `npm run test:vscode` passed (9 passing, 4 pending screenshots; hostile-links 1; cross-surface 4), on the same head. The card stays in `doing` until PR #76 merges and post-merge CI succeeds.
