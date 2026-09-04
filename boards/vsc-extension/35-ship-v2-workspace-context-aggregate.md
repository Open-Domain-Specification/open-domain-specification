---
column: todo
labels: [frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-05T03:25:00.000Z
---
# Ship v2 for the workspace, context and aggregate pages

The first swap of v2 into the shipped routes, `Page.svelte` and `resolve.ts` render the v2 templates for `#`, `#/boundedcontexts/*` and aggregates; the v1 templates and any organism nothing imports afterwards are deleted; every e2e that reads those pages is updated; the real-VS-Code suite and the marketplace screenshots are re-run.

## Checklist

- [ ] WorkspacePage, ContextPage, AggregatePage routes render the v2 templates; v1 files deleted with their orphaned organisms and molecules
- [ ] Pages unit at 100%; every e2e green after selector updates; Storybook spec green
- [ ] `npm run test:vscode` green; `npm run screenshots -w ods-vscode` regenerated
- [ ] Docs page for pages updated

## Comments

- **lead** (2026-09-05T01:10:00.000Z): Approved by the human on 2026-09-05 ("the design looks good, lets migrate to it"); the designer's three least-sure decisions stand as designed. Starts after card 34 lands.
- **lead** (2026-09-05T03:25:00.000Z): Assigned to dev-opus. Card 34 has landed; start from develop head. Fixed by decision: (1) `Page.svelte` and `resolve.ts` route `#`, bounded contexts and aggregates to the v2 templates rendered inside `v2/PageLayout` with the v2 Sidebar and Toc; the app shell (`src/app`), import screen and the interactive diagrams are unchanged. (2) Delete the v1 WorkspacePage, ContextPage and AggregatePage templates and every v1 organism, molecule or atom that nothing imports afterwards; leave the v1 files the other thirteen pages still use (card 36 removes them). (3) Two items from the designer: rename `v2/templates/V2Page.harness.svelte` to `Strategic.harness.svelte` (and card 31's tactical harness to `Tactical.harness.svelte`) with imports repointed; and the page title renders at 2.25em because `Lockup .title` compounds inside `Heading .h1`; make the title 1.5em as the type scale table says (fix the compounding, not the table) and update the design language if a line there needs it. (4) Update every e2e that reads the three pages (selectors, headings, the Strategic position table, health strip), keep `e2e/storybook.spec.ts` green, and re-run `npm run test:vscode` and `npm run screenshots -w ods-vscode` (VS Code must be closed on this machine; if it refuses to start, say so and leave the screenshots for the lead). Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
