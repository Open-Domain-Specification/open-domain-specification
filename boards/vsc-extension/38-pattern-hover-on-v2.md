---
column: todo
labels: [frontend, ddd]
priority: high
agent: dev-opus
updatedAt: 2026-09-05T06:40:00.000Z
---
# Pattern hover disclosure on the v2 pages

Card 27's hover (what the DDD keyword means, then this relationship's disposition and comments) was built on v1 parts that card 36 deletes. Rebuild it on the v2 `HoverCard` frame and wire it into the v2 Strategic position table (type and role keywords) and the relationship detail's role cards, with the same behaviour: open on hover after 150 ms and on focus, pin on click, close on Escape and outside click, one open at a time; part 1 always renders (name with abbreviation, summary, architectural nature), part 2 (disposition, comments with links) only when the intent has any.

## Checklist

- [ ] `molecules/PatternHover.svelte` (v2 primitives only) with a `hover.svelte.ts` state module, tests at 100%
- [ ] Wired into `organisms/StrategicPositionTable.svelte` keywords and `organisms/RelationshipDetail.svelte` role cards
- [ ] Storybook stories in light, dark and high contrast for: no comments, comments, tolerated, refactor; render spec green
- [ ] e2e: hover `ACL` on the petstore Sales page, read the anti-corruption-layer summary and the PetSummaryClient comment, Escape closes (restore the case card 36 removed)
- [ ] Design language: the HoverCard primitive row names this as its first use

## Comments

- **lead** (2026-09-05T06:40:00.000Z): Assigned to dev-opus, starts after card 36 lands (the lead will say). Fixed by decision: the HoverCard frame from card 28 is the container; content order is RFC-002 section 4 as card 27 shipped it; no pills or chips anywhere in it, keywords and the Disposition primitive only. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
