---
column: todo
labels: [infra, perf, frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-05T12:00:00.000Z
---
# Pages unit tests: the large-model "every ref renders" cases time out under load

`packages/pages/src/lib/Page.test.ts` ("every element of the reference organisations renders its own page", RiverMart / StreamLine / NorthBank) and one case in `packages/pages/src/app/App.test.ts` render every page of a reference model through jsdom in one `it`. Each runs 60-300 s when the machine is busy and trips the 30 s `testTimeout` in `packages/pages/vitest.config.ts`. Four developers hit it independently on 2026-09-03 while other suites ran in parallel; each reproduced it on a clean develop tree, so it is not caused by any card. CI on a quiet runner passes.

## Checklist

- [ ] Profile one of the cases: is the time in graphviz-wasm, Svelte mount/unmount, or jsdom teardown?
- [ ] Either split each model into per-context cases with `it.each`, or render once per model and assert over the DOM; keep the assertion that every ref renders
- [ ] Per-case time under 10 s on a loaded machine; no change to the 30 s default timeout or the 100% coverage thresholds
- [ ] Root `npm test` green

## Comments

- **lead** (2026-09-03T19:05:00.000Z): Raised from the reports on cards 13, 15, 36, 37 and 38. Not assigned yet.
- **lead** (2026-09-05T12:00:00.000Z): Now blocking, and assigned to dev-opus. It is no longer only a local-load problem: PR 23's CI run 33880649897 failed with `RiverMart: every ref renders` timing out at 30000ms in `packages/pages/src/lib/Page.test.ts:66`, 586 of 587 passing. Fixed by decision: keep the assertion that every ref of every reference model renders its own page; make each `it` small enough to finish well inside the 30s default, by splitting per bounded context with `it.each` (or per model plus per context, whichever reads better) so one case renders a handful of pages, not hundreds. Do not raise `testTimeout` in `packages/pages/vitest.config.ts` and do not skip a model. Same treatment for the equivalent case in `packages/pages/src/app/App.test.ts` if it is over the same order of magnitude. Profile first and journal where the time actually goes (graphviz-wasm, Svelte mount, jsdom teardown); if the cost is one shared setup being repeated per case, hoist it. Evidence: the pages unit suite green with each case's own duration reported, coverage still 100%, and the whole suite's wall time no worse than today. Work in your worktree with absolute paths; build core and graphviz first; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
