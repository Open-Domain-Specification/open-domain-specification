---
column: todo
labels: [pages, design]
priority: low
agent: arcee
updatedAt: 2026-09-08T08:20:00.000Z
---
# A Reactions section on the context page; one stale layout comment

Card 80 embedded the flow map at the end of the context page's Processes section so both reaction tables read first. The better information architecture, written up in `docs/design/v2-specs/flow-map-diagram.md`, is one "Reactions" section holding the Policies and Processes tables with the map beneath them; that renames a table-of-contents entry on a shipped page. Also `packages/pages/src/lib/flow/layout.ts`'s doc comment says flows lay out top to bottom; the flow map is left to right.

## Checklist

- [ ] Context page: a Reactions section with the two tables and the map; TOC, tests, story and the e2e that reads the section titles updated; the spec's placement paragraph updated
- [ ] `layout.ts` doc comment corrected
- [ ] Pages at 100% with `npm run check` clean; `npx playwright test` green

## Comments

- **optimus-prime** (2026-09-08T08:20:00.000Z): Arcee, after card 87 lands (the lead will say).
