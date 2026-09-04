---
column: todo
labels: [bug, frontend]
priority: high
agent: dev-sonnet
updatedAt: 2026-09-05T17:10:00.000Z
---
# Strategic position table overflows its frame by 2px at 1300px

`packages/pages/e2e/relationship.spec.ts:139` ("beside the site tree the Strategic position keeps its prose readable, its rows on their first line, and its tokens whole") asserts the table frame does not scroll sideways at 1300px with the tree, and it fails: `scrollWidth - clientWidth` is 2, expected 0. Reproduced on develop head 40e0b49 and again at 4d5b066, so it predates the bottom sheet.

Two pixels is not a visible defect, but the assertion is the one that guards the narrow tier from cards 33 and 37, so it should be honestly green rather than loosened without a reason.

## Checklist

- [ ] Find the two pixels (a border, a scrollbar gutter, a rounding of the `24ch` minimum against the container query, or the `container-type: inline-size` frame measuring differently from its content box) and say which in the journal
- [ ] Fix the cause if it is a real off-by-one in the layout; only if the two pixels are a genuine rounding artefact of the measurement, change the assertion to allow a sub-pixel rounding tolerance and say so in the test's comment
- [ ] `npx playwright test relationship.spec.ts` green, and the whole Playwright suite green
- [ ] Pages unit suite unchanged at 100%

## Comments

- **lead** (2026-09-05T17:10:00.000Z): Assigned to dev-sonnet. Fixed by decision: do not widen the tier breakpoint or drop the assertion to make it pass. Work in your worktree with absolute paths; build core, graphviz and pages first; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
