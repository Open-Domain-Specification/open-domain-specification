---
column: todo
labels: [bug, infra, frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-05T23:00:00.000Z
---
# Two e2e specs fail on Linux, blocking the release

The new CI e2e job (project card 43) ran the Playwright suite on a Linux runner for the first time and two specs fail there while passing on macOS. `publish` now depends on that job, so this blocks the release. Run 33909581491 on PR 24.

1. `packages/pages/e2e/relationship.spec.ts:275` — the first Strategic position row's height is 88px, asserted `< 80`. The runner's fonts are not the developer's, so the description wraps to one more line and the row is a line taller. The assertion's intent is "the description reads as prose, not a word a line, and the row stays short", and a pixel count tuned on one machine cannot say that.
2. `packages/pages/e2e/diagrams-context.spec.ts:160` ("the shared kernel the model wants refactored is marked on the workspace map") — `locator.click` times out after 30s at `:182`, waiting on the anchored disclosure card's heading. It passes locally. Likely the map's fit differs on the runner (different viewport metrics after the panel-fit change from card 20), leaving the badge outside the view or under a panel.

## Checklist

- [ ] Failure 1: express the intent in terms the platform cannot move — line count against the computed line height, or the description's height against a single line's — rather than an absolute pixel threshold; say in the test's comment what it is really asserting
- [ ] Failure 2: find why the click never lands on the runner and fix the cause; if the badge is genuinely out of view, the spec should scroll or fit to it the way a reader would, not raise the timeout
- [ ] Audit the rest of the suite for the same class of assertion (absolute pixel thresholds tuned on macOS) and fix any others you find, listing them in the journal
- [ ] Both specs green locally
- [ ] Pages unit suite unchanged at 100%

## Comments

- **lead** (2026-09-05T23:00:00.000Z): Assigned to dev-opus. Fixed by decision: do not raise the Playwright timeout, do not skip either spec, and do not weaken an assertion to "greater than zero"; each must still fail if the defect it guards comes back. You cannot reproduce the Linux font metrics locally, so reason from the numbers in the run rather than tuning to your own machine: 88px against a 22px line is four lines where three was intended. Verify by pushing to your branch if you want a runner, or by reasoning it through and saying so. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
