---
column: backlog
labels: [frontend, bug]
priority: low
updatedAt: 2026-09-05T00:10:00.000Z
---
# V2/Compare context page story collapses the v1 column

In `V2/Compare/Context page` the v1 column shrinks to a sliver because the v1 interactive diagram forces the v2 column's width. Give each column of `packages/pages/src/lib/v2/templates/Compare.harness.svelte` a min-width (half of the 1200px cap) and let the story scroll horizontally, so both columns read at their natural width.

## Checklist

- [ ] Columns keep a 600px minimum; the story container scrolls horizontally
- [ ] `e2e/storybook.spec.ts` still green; a Compare.harness test asserts the column widths
