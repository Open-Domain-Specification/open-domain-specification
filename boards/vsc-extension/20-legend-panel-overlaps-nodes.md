---
column: backlog
labels: [bug, frontend]
priority: med
updatedAt: 2026-09-03T23:40:00.000Z
---
# Legend panel overlaps the Catalog node on the petstore context map

In the petstore commerce context map the legend panel (top-left) sits on top of the Catalog BC ellipse at the default fit. Seen in apps/ods-vscode/media/screenshots/context-map-dark.png and flagged in the RFC-001 product review. Either fit the view with padding that accounts for the panels, or collapse the legend by default when it would cover a node.

## Checklist

- [ ] Reproduce with a Playwright screenshot of the petstore commerce context map
- [ ] Fix so no node is covered at the default fit on the four reference models
- [ ] E2e assertion that the legend's box does not intersect any node's box after fit
