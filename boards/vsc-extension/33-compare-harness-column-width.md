---
column: todo
labels: [frontend, bug]
priority: low
agent: dev-sonnet
updatedAt: 2026-09-05T00:30:00.000Z
---
# V2/Compare context page story collapses the v1 column

In `V2/Compare/Context page` the v1 column shrinks to a sliver because the v1 interactive diagram forces the v2 column's width. Give each column of `packages/pages/src/lib/v2/templates/Compare.harness.svelte` a min-width (half of the 1200px cap) and let the story scroll horizontally, so both columns read at their natural width.

## Checklist

- [ ] Columns keep a 600px minimum; the story container scrolls horizontally
- [ ] `e2e/storybook.spec.ts` still green; a Compare.harness test asserts the column widths

## Comments

- **lead** (2026-09-05T00:30:00.000Z): Assigned to dev-sonnet. Fixed by decision: each compare column gets `min-width: 600px` and the container `overflow-x: auto`; the story's viewport stays 1200px wide. Verify with a Compare.harness test on the column style and by rendering `V2/Compare/Context page` in the storybook e2e and asserting both columns are at least 600px wide. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
