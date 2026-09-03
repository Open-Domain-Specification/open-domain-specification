---
column: backlog
labels: [infra, perf, frontend]
priority: med
updatedAt: 2026-09-03T19:05:00.000Z
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
