---
column: review
labels: [infra, perf, frontend]
priority: high
agent: dev-opus
live: false
clean-code-swept: true
updatedAt: 2026-09-05T12:40:00.000Z
---
# Pages unit tests: the large-model "every ref renders" cases time out under load

`packages/pages/src/lib/Page.test.ts` ("every element of the reference organisations renders its own page", RiverMart / StreamLine / NorthBank) and one case in `packages/pages/src/app/App.test.ts` render every page of a reference model through jsdom in one `it`. Each runs 60-300 s when the machine is busy and trips the 30 s `testTimeout` in `packages/pages/vitest.config.ts`. Four developers hit it independently on 2026-09-03 while other suites ran in parallel; each reproduced it on a clean develop tree, so it is not caused by any card. CI on a quiet runner passes.

## Checklist

- [x] Profile one of the cases: is the time in graphviz-wasm, Svelte mount/unmount, or jsdom teardown?
- [x] Either split each model into per-context cases with `it.each`, or render once per model and assert over the DOM; keep the assertion that every ref renders
- [x] Per-case time under 10 s on a loaded machine; no change to the 30 s default timeout or the 100% coverage thresholds
- [x] Root `npm test` green

## Gates

- [x] qa-automated — after merging develop: pages 631 at 100%, Page.test.ts 167 cases in 9.9s with the slowest at ~1.5s under load (lead, 2026-09-05T12:40:00Z)

- [x] clean-code-swept — self-scan (diff is 46 lines in one file, under the sub-agent threshold); renamed the helper to `expectEveryRefRenders` and documented its empty-group assertion at packages/pages/src/lib/Page.test.ts:70-71, biome clean (dev-opus, 2026-09-05T13:20:00.000Z)

## Comments

- **lead** (2026-09-03T19:05:00.000Z): Raised from the reports on cards 13, 15, 36, 37 and 38. Not assigned yet.
- **lead** (2026-09-05T12:00:00.000Z): Now blocking, and assigned to dev-opus. It is no longer only a local-load problem: PR 23's CI run 33880649897 failed with `RiverMart: every ref renders` timing out at 30000ms in `packages/pages/src/lib/Page.test.ts:66`, 586 of 587 passing. Fixed by decision: keep the assertion that every ref of every reference model renders its own page; make each `it` small enough to finish well inside the 30s default, by splitting per bounded context with `it.each` (or per model plus per context, whichever reads better) so one case renders a handful of pages, not hundreds. Do not raise `testTimeout` in `packages/pages/vitest.config.ts` and do not skip a model. Same treatment for the equivalent case in `packages/pages/src/app/App.test.ts` if it is over the same order of magnitude. Profile first and journal where the time actually goes (graphviz-wasm, Svelte mount, jsdom teardown); if the cost is one shared setup being repeated per case, hoist it. Evidence: the pages unit suite green with each case's own duration reported, coverage still 100%, and the whole suite's wall time no worse than today. Work in your worktree with absolute paths; build core and graphviz first; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
- **dev-opus** (2026-09-05T12:30:00.000Z): Picked this up. The worktree was on the v0.2.0 tag, so `git reset --hard develop` (now a3844f4), `npm ci`, then built core and graphviz. One correction before profiling: `packages/pages/src/app/App.test.ts` no longer has a reference-model case — every case there renders the petstore only (`packages/pages/src/app/App.test.ts:7-9`), so the whole cost lives in `packages/pages/src/lib/Page.test.ts:61-73`. Profiling that next.
- **dev-opus** (2026-09-05T13:00:00.000Z): Profiled with a throwaway test that timed each phase separately over all three reference models. It is Svelte mount, and nothing else: **957 refs, mount 7453 ms, unmount 411 ms, building the fixtures 11 ms**. No graphviz-wasm is involved in a page render at all — the only `graphviz` references under `src/lib` are in the Svelte Flow graph builders (`packages/pages/src/lib/flow/context-graph.ts`, `packages/pages/src/lib/flow/relation-graph.ts`), not on the render path, and the jsdom stand-ins are installed once for the whole suite at `packages/pages/src/lib/test-setup.ts:5`. So there is no shared setup being repeated per case to hoist — the cost is simply linear, ~7.8 ms of mount per page, and the only fix is fewer pages per `it`. Heaviest single page is the workspace page `#` at ~83 ms (the context map).
- **dev-opus** (2026-09-05T13:10:00.000Z): Split it per model then per bounded context, as the lead's option (b), at `packages/pages/src/lib/Page.test.ts:62-111`. Each model now gets its own nested `describe` (`packages/pages/src/lib/Page.test.ts:80`) holding one `it.each` case per bounded context plus one case for what no context owns — the workspace page, health, teams, domains, subdomains and relationships (`packages/pages/src/lib/Page.test.ts:85-94`). Group sizes are 5-41 refs per context and 52-64 for the workspace-level remainder, against 272-352 refs per model before. The "every ref renders" guarantee is now carried by two things: `expectEveryRefRenders` still asserts an `<h1>` per page and rejects an empty group (`packages/pages/src/lib/Page.test.ts:70-78`), and a new case asserts the groups' union is exactly `pageRefs(ws)` (`packages/pages/src/lib/Page.test.ts:101-105`), so a ref that falls outside every group fails rather than silently going unrendered. Checked that guard bites: slicing one ref off the remainder group made it fail for all three models, and passing again with the slice removed. `packages/pages/vitest.config.ts` is untouched — the 30 s `testTimeout` and the 100 % thresholds are as they were, and no `it` sets a timeout of its own.
- **dev-opus** (2026-09-05T13:20:00.000Z): Evidence. Slowest case in the reference-organisation block, measured during a full-93-file parallel `vitest run` (the loaded case): **1504 ms** for RiverMart's workspace-level group, then 723 ms Order Management, 623 ms Warehouse — against 3013 / 2015 / 2601 ms for the three old monolithic cases on an *idle* machine, and 30 000 ms+ under CI load. That is a 20x margin to the timeout on the worst case. Whole-suite wall time is unchanged: `npm run test:unit` in `packages/pages` was 9.81 s for `Page.test.ts` alone before and 9.69 s after, and the full unit suite is 24.3-24.4 s either side. `npm run test:unit`: 93 files, 631 tests passing, coverage `All files 100 / 100 / 100 / 100`. Root `npm test` green across all 10 projects. One thing for the lead to note when reading the diff: the case count in this file rose from 123 to 167 because each context is now its own case — same pages rendered, just reported individually as the card asked.
- **lead** (2026-09-05T12:40:00.000Z): Reviewed. The union assertion keeps the every-ref guarantee and was proven to bite. Landing on develop; this unblocks PR 23.
