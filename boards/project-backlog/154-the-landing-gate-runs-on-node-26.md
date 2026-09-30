---
column: doing
labels: [infra, bug]
priority: medium
agent: lead
live: true
clean-code-swept: true
updatedAt: 2026-09-30T17:40:00Z
---
# The landing gate runs on Node 26

Issue #99, epic #100. The root `package.json` declares `node >=24`, but on Node 26.8.1 the unmodified `bash scripts/verify-all.sh` fails in `packages/pages`: the jsdom suites find `localStorage` undefined, and 33 tests in two files fail. The gate passed on epic #96 only with a caller-supplied `NODE_OPTIONS=--no-experimental-webstorage`. CI runs Node 24 and is green, so it does not see the gap.

## Checklist

- [x] Reproduce on Node 26.8.1 with no flag
- [x] Identify the Node, jsdom and Vitest interaction
- [x] The smallest robust correction, in the test environment only; no assertion weakened, no renderer or model change
- [x] A regression test proving the jsdom suites receive jsdom's working storage
- [x] Focused pages tests pass with no manual override
- [x] Independent issue-level review
- [x] STATUS.md

## Gates

- [x] Focused: `packages/pages` unit suite on Node 26 with no `NODE_OPTIONS`
- [x] Clean-code sweep
- [ ] `bash scripts/verify-all.sh` green on the final integrated head under Node 26.8.1, with no `NODE_OPTIONS`
- [x] Integrated review before the PR
- [ ] One PR to `develop` for epic #100; CI `test`, `e2e` and `real-vscode` green

## Comments

- **lead** (2026-09-30T17:30:40Z): Picked up on `codex/epic-100-node26-gate` from `origin/develop` `33fd9c09`.
- **lead** (2026-09-30T17:30:40Z): Reproduced with no flag and `NODE_OPTIONS` empty: `src/lib/flow/options.test.ts` fails on `localStorage.removeItem`, with Node's warning that `localStorage` is not available because `--localstorage-file` was not provided. Cause: Node 25 and later define `localStorage` and `sessionStorage` on the global as getters that return `undefined` without that flag. Vitest 3.2.4's jsdom environment (`getWindowKeys`) copies a jsdom key onto the global only if the global lacks it or the key is in Vitest's own `KEYS` list, which names `Storage` but not the two instances. So Node's getters stay and shadow jsdom's storage. On Node 24 the globals are absent and jsdom's storage is copied as before. Vitest 3.2.7, the last 3.x, has the same code.
- **lead** (2026-09-30T17:30:40Z): Chosen correction, test environment only: `packages/pages/src/lib/test-setup.ts` binds `localStorage` and `sessionStorage` to `globalThis.jsdom.window`'s storage whenever the jsdom environment is active. The alternatives were rejected. A `--no-experimental-webstorage` execArgv in the Vitest config relies on a flag Node will retire once web storage is stable, and then Node would refuse to start. A Vitest major upgrade across ten packages is out of proportion to the defect. `packages/pages` is the only package with a jsdom environment. The new `src/lib/test-setup.test.ts` pins both globals to jsdom's `Storage`, and that they keep what is written. Without the fix on Node 26 the three affected files fail 35 of 36 tests: 33 existing and the 2 new. With it, 36 of 36 pass on Node 26.8.1 and on 24.15.0. Full pages unit suite on Node 26, no override: 106 files, 996 tests, coverage thresholds held; `svelte-check` 0 errors. No assertion, renderer or model file changed.
- **lead** (2026-09-30T17:33:21Z): Independent issue-level review (Sonnet, read-only) approved 54429e8a. It verified the root cause in the Vitest source. It reproduced the discrimination with the old setup outside the repo: both new tests fail on Node 26, and all pass on Node 24. It also ran the full pages suite on both Node versions. Its one optional note, that the getters rely on per-file isolation, is now a sentence in the setup's comment. Clean-code pass: no finding above 0.5. The full gate runs on the final head, and its result goes in the PR so that no commit follows the gated head.
- **lead** (2026-09-30T17:40:00Z): An integrated review of the branch against #99 and #100 (Sonnet, read-only) approved 79b8679e. `bash scripts/verify-all.sh` then passed on 79b8679e with Node 26.8.1 and `NODE_OPTIONS` unset. Results: core 1040, graphviz 35, doc 44, skill 62, northbank 3, petstore 23, rivermart 6, streamline 3, clinic 7, models/_shared 9, pages 996, apps/docs 24, apps/ods-vscode 18, scripts 31; ESM imports ok, schema match; pages e2e 408 passed and 20 skipped. The journal times on this card, STATUS.md and sprint 03 were written ahead of the clock; they now match the commits that carried them. That correction is the only change since, and the gate reruns on the corrected head, which the PR records.
