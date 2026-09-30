---
column: doing
labels: [infra, bug]
priority: medium
agent: lead
live: true
clean-code-swept: true
updatedAt: 2026-09-30T16:31:00Z
---
# The cross-surface fixture is checked against its generator

Issue #75, epic #96. `apps/ods-vscode/src/test/fixtures/cross-surface/.ods/cross_surface.json` is written by `generate.ts` beside it and committed, and the viewer, the static export, the real VS Code webview and generated Markdown all read that committed JSON against one `expected.ts`. Nothing regenerated it and compared, and nothing pinned the diagnostic the fixture carries on purpose: one `consumption-agreement` warning, on the Warehouse API's consumption of `StockChecked`, which names neither of the two agreements between Vendor and Warehouse.

## Checklist

- [x] Reproduce the drift risk: run the generator and compare its output with the committed JSON
- [x] The generator takes an output folder, defaulting to `.ods` beside it
- [x] A vitest test in `apps/ods-vscode` runs the generator into a temporary folder and compares the bytes with the committed JSON
- [x] The same test pins the fixture's exact diagnostics (severity, rule, ref) from `expected.ts`, and ties the warning to the consumption `expected.ts` lists with no agreement
- [x] The committed JSON is the generator's output, rebuilt and not hand-edited, and a formatter pass cannot rewrite it
- [x] Demonstrate that a stale committed fixture and a moved diagnostic each fail the test
- [x] The four surfaces still read the same fixture and `expected.ts`
- [x] Independent review of the change against #75
- [x] STATUS.md

## Gates

- [x] Focused: `npx vitest run` in `apps/ods-vscode`, and the Markdown cross-surface test in `packages/doc`
- [x] Clean-code sweep
- [x] `bash scripts/verify-all.sh` green on 96faad37, the commit that changes code (the Codex lead's run)
- [ ] `bash scripts/verify-all.sh` green on the final integrated head (Codex's integrated review)
- [ ] One PR to `develop` for epic #96, reviewed by Codex; #75 and #96 stay open until it is merged and post-merge CI is green

## Comments

- **lead** (2026-09-30T16:18:02Z): Picked up on `codex/epic-96-cross-surface-fixture`, based on `origin/develop` `fef6d993` plus the lead's planning commit `b09b76c8`.
- **lead** (2026-09-30T16:31:00Z): The drift was real before any change: running `generate.ts` rewrote the committed `cross_surface.json`, because a biome pass had collapsed four one-item role arrays (`upstreamRoles`, `downstreamRoles` on the two named agreements) after generation. 96faad37 regenerates it (no hand edit), adds `!apps/ods-vscode/src/test/fixtures/cross-surface/.ods` to biome's excludes beside `models/*/.ods`, lets `generate.ts` take an optional output folder, and adds `apps/ods-vscode/src/cross-surface-fixture.test.ts`: (1) runs the generator with `process.execPath` into a `mkdtemp` folder and compares bytes with the committed JSON; (2) compares `validate()` on the committed fixture, as `{severity, rule, ref}`, with `EXPECTED.diagnostics`, now the exact list, one `warning consumption-agreement` at `#/boundedcontexts/warehouse/services/warehouse_api/consumes/boundedcontexts~vendor~services~vendor_api~provides~stock_checked`; (3) ties that ref to the one consumption `expected.ts` lists with no agreement (`StockChecked`, no relationship). No metamodel or validator change. The test runs in the gate's `apps/ods-vscode` vitest step and in CI's `npm test`.
- **lead** (2026-09-30T16:31:00Z): Failure demonstrations, each a temporary edit restored with `git checkout` of only `generate.ts` and `cross_surface.json`:
  - the pre-change committed fixture: test 1 fails;
  - a generator description changed and the JSON not regenerated: test 1 fails ("the committed fixture is stale: run … generate.ts …"), 2 and 3 pass;
  - the committed JSON edited by hand: test 1 fails;
  - `StockChecked` given `relationship: purchaseFeed`, fixture regenerated: test 1 passes, 2 fails (`expected [] to deeply equal [ { severity: 'warning', … } ]`), 3 fails;
  - a rootless aggregate added, fixture regenerated: 2 fails on the extra `aggregate-root` warning.
  Restored tree clean, 3 of 3 pass.
- **lead** (2026-09-30T16:31:00Z): Focused: `apps/ods-vscode` vitest 18 passed (3 new); `packages/doc` `src/cross-surface.test.ts` 3 passed. `expected.ts` stays import-free and no consumer read `EXPECTED.diagnostics`, so the pages e2e, the real-VS-Code mocha suite and the Markdown test compile and read the same fixture unchanged.
- **lead** (2026-09-30T16:31:00Z): Independent review (a Sonnet reviewer, read-only): approve, no blocking findings. Low: the sibling `long-evidence` fixture has no generator and is still biome-formatted, which is out of #75's scope and noted in STATUS as a possible follow-up. Low: test 3 partly checks `EXPECTED` against itself but ties the ref to the model. Info: the test reads core's built dist, so after a core change a bare local run needs a core build first; the gate and CI build first. An independent clean-code audit (Codex) found no introduced violations.
- **lead** (2026-09-30T16:31:00Z): My own gate run was stopped partway through, after the models and before pages finished, and is not evidence. The Codex lead ran `bash scripts/verify-all.sh` on 96faad37 with `NODE_OPTIONS=--no-experimental-webstorage` (Node 26.8.1 otherwise gives jsdom a broken global `localStorage`, and unrelated pages tests fail): green, with core 1040, graphviz 35, doc 44, skill 62, northbank 3, petstore 23, rivermart 6, streamline 3, clinic 7, models/_shared 9, pages 994, apps/docs 24, apps/ods-vscode 18, scripts 31, ESM imports ok, schema match, pages e2e 408 passed and 20 skipped. The card stays `doing` until the PR is merged and post-merge CI is green.
