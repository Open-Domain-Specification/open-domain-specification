---
column: todo
labels: [frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T08:00:00.000Z
---
# Disposition marks and badge disclosure on the shipped context map (RFC-002 card F)

The context map designed in card 19 (`packages/pages/src/lib/evidence/DispositionEdge.svelte`, `DispositionLegend.svelte`, `DispositionMap.harness.svelte`) becomes the shipped map: role and type badges on `ContextEdge.svelte` carry the disposition mark (warning colour for refactor, outlined for tolerated), the hover summary from `PATTERNS`, and a click that opens `RelationshipDetail` as a card anchored inside the diagram. The legend gains the two disposition rows only when the map draws one.

## Checklist

- [ ] `ContextEdge.svelte` / `PortBadge.svelte` take the disposition and the click handler; `DispositionEdge.svelte` and its duplicated geometry are deleted (the TODO from card 19)
- [ ] `InteractiveDiagram.svelte` owns the open-card state (a small `.svelte.ts` module like fullscreen), renders the anchored card in the viewport portal above the edge layers with the z-index and max-height fix from the harness, closes on Escape, outside click and navigation
- [ ] `LegendPanel.svelte` adds "outlined badge: tolerated" and "warning badge: refactor" rows when present; `DispositionLegend.svelte` deleted
- [ ] Storybook: the evidence map story uses the shipped `InteractiveDiagram`; `DispositionMap.harness.svelte` deleted
- [ ] Pages unit at 100%; e2e case on the petstore Sales page: the shared-kernel badge carries the refactor mark, clicking it opens the card with the relationship title, Escape closes it; `e2e/storybook.spec.ts` still green

## Comments

- **lead** (2026-09-04T08:00:00.000Z): Assigned to dev-opus. Fixed by decision: no new edge type; the disposition rides on the existing context edge data. Consumable-map lollipops and sockets are NOT in this card. Keep the sketch style default; the card style must render the marks too. Start after card 23 has landed on develop (the lead will say). Work in your worktree with absolute paths for every suite; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
