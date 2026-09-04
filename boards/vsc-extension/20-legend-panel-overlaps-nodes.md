---
column: todo
labels: [bug, frontend]
priority: med
agent: dev-opus
updatedAt: 2026-09-05T00:30:00.000Z
---
# Legend panel overlaps the Catalog node on the petstore context map

In the petstore commerce context map the legend panel (top-left) sits on top of the Catalog BC ellipse at the default fit. Seen in apps/ods-vscode/media/screenshots/context-map-dark.png and flagged in the RFC-001 product review. Either fit the view with padding that accounts for the panels, or collapse the legend by default when it would cover a node.

## Checklist

- [ ] Reproduce with a Playwright screenshot of the petstore commerce context map
- [ ] Fix so no node is covered at the default fit on the four reference models
- [ ] E2e assertion that the legend's box does not intersect any node's box after fit

## Comments

- **lead** (2026-09-05T00:30:00.000Z): Assigned to dev-opus. Fixed by decision: fit the view so no node sits under the legend or the options panel at the default zoom, measured after mount (the panels' boxes are known; pad the fitView bounds on the side each panel occupies, or shift the viewport by the panel's width plus a gutter after fitView). Do not collapse the legend by default. Apply to context, consumable and relation maps. Test: an e2e case over the four reference models' workspace context maps asserting no node bounding box intersects the legend or options panel; the pages unit suite at 100%. Work in your worktree with absolute paths; build core, graphviz and pages first; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
