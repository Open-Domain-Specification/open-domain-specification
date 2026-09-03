---
column: todo
labels: [frontend, docs]
priority: high
agent: dev-sonnet
updatedAt: 2026-09-04T03:00:00.000Z
---
# Ship the grouped Strategic position table with descriptions (RFC-002 card B)

The context page's relationship table becomes the grouped table designed in card 19: rows under Depends on / Depended on by / Works alongside, one per counterpart, with a Description column. No comments or dispositions yet: those arrive with project card 40 and a follow-up. The doc generator's context page gains the same grouping and column.

## Checklist

- [ ] `packages/pages/src/lib/templates/ContextPage.svelte` renders `StrategicPositionTable` (packages/pages/src/lib/organisms/StrategicPositionTable.svelte) in place of the inline table; the expandable row and the disposition column are hidden when no comment sheets are supplied (make `sheets` optional on the organism, defaulting to none)
- [ ] The organism's dependency on `packages/pages/src/lib/evidence/fixtures.ts` types is reduced to what it needs; nothing shipped imports fixture data
- [ ] `packages/doc/src/boundedcontext.md.ts`: the relationship table groups the same way and gains a Description column; `packages/doc/src/index.test.ts` expectations updated; the four models rebuilt so `models/*/docs` change accordingly
- [ ] Pages unit suite at 100%; `ContextPage.test.ts` asserts the three group headings and a description cell; e2e context page spec still green; `assertDocSite` green for the four models
- [ ] Storybook `Templates/ContextPage` story shows the grouped table

## Comments

- **lead** (2026-09-04T03:00:00.000Z): Assigned to dev-sonnet. Fixed by decision: the existing table is replaced, not kept beside the new one; group headings are exactly "Depends on", "Depended on by", "Works alongside"; a group with no rows is omitted; the description cell is empty when the relationship has none. Hover summaries on chips are NOT in this card (they come with the core knowledge base). Do not touch core; project card 40 changes the schema in parallel and your tree will not have it. Work in your worktree; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
