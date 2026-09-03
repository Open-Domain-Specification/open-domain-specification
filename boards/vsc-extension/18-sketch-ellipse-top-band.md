---
column: review
labels: [bug, frontend]
priority: med
agent: lead
clean-code-swept: true
updatedAt: 2026-09-03T23:05:00.000Z
---
# Sketch ellipses carry a flat cluster band along their top edge

In the sketch style the context node kept the card style's 4px cluster-colour top band (5px in sketch), so each ellipse had a flat cap along its top that read as a stray border. The backdrop already carries the cluster colour, so the ellipse keeps one even 2px stroke; the big-ball-of-mud node keeps its dashed brown edge.

## Checklist

- [x] `.flow-card.sketch.context-node` top edge matches its other edges in packages/pages/assets/page.css
- [x] Mud node keeps its dashed brown top
- [x] Sketch and context e2e specs green; screenshot of the petstore commerce map reviewed

## Gates

- [x] clean-code-swept — two-rule CSS change, nothing to sweep (lead, 2026-09-03T23:05:00Z)
- [x] qa-automated — pages e2e diagrams-sketch and diagrams-context 3/3 after a rebuild; Playwright screenshot reviewed (lead, 2026-09-03T23:05:00Z)

## Comments

- **jonathan** (2026-09-03T23:00:00.000Z): On the circular cards in the Svelte Flow canvas there is a top border or similar; remove it, it looks strange.
- **lead** (2026-09-03T23:05:00.000Z): Cause was the cluster band at packages/pages/assets/page.css:463-465 widened to 5px for sketch. Now an even 2px `--fg` stroke, with the mud variant keeping its brown top. Fixed in place by the lead as a two-line CSS change.
