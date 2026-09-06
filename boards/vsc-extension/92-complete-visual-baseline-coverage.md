---
column: backlog
labels: [frontend, docs]
priority: high
agent: lead
live: false
updatedAt: 2026-09-05T17:08:02.807787+00:00
---
# Complete the browser and remaining page-family baseline coverage

The user-requested full designer sweep remains partial. the design reviewer inspected nine native page families, three diagram kinds and selected light/dark states, while the accessibility reviewer completed source/component accessibility review. The local viewer is available at http://127.0.0.1:4193/ while its parent dev process runs, but IAB became unavailable and CUA acquisition of native Chrome hung for266.7s before cancellation. This is a review-infrastructure/coverage task, not a product bug.

Evidence: the design review (report deleted 2026-09-07):1 and docs/bots/design/ (deleted 2026-09-07)2026-09-05-the accessibility reviewer-baseline.md:1. Source moved from6ec06ed to f7a43c3 during review; freeze a fresh candidate before completing coverage. Native loaded-bundle provenance was not established by the design reviewer.

## Checklist

- [ ] Restore a usable browser/inspection surface and verify the reviewed source/bundle/fixture SHA
- [ ] Visually inspect remaining entity, value object, consumable, schema, invariant, policy, relationship and Health page families
- [ ] Complete narrow/short and representative light/dark/high-contrast checks on every page family
- [ ] Inspect dense NorthBank, RiverMart, StreamLine, long-content and empty/error fixtures
- [ ] Retest fullscreen entry/exit against known bundle in both hosts; update existing card14
- [ ] Complete browser/export host parity and interaction checks
- [ ] Run actual keyboard/screen-reader, reduced-motion and measured contrast checks from the QA matrix
- [ ] Consolidate final coverage, ticket any new defects and return QA/the design reviewer recommendations to the lead

## Comments

- **lead** (2026-09-05T17:08:02.807787+00:00): Explicitly retained remaining coverage from the design review (report deleted 2026-09-07):1. No full-sweep or release approval claim; UI-control failures prevented completing the remaining rendered checks.
