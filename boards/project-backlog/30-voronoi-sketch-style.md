---
column: doing
labels: [frontend, ddd]
priority: med
agent: claude
live: true
status: Delegated: circular nodes with a Voronoi backdrop as a third figure style
progress: 10
updatedAt: 2026-09-03T09:00:00.000Z
---
# Sketch style: circular nodes and a Voronoi backdrop

A third look for the interactive diagrams, selectable from the options panel beside handles and edges, in the spirit of hand-drawn DDD context maps: nodes as ellipses, an organic outer blob around the whole system, and dashed blob regions per subdomain computed as a Voronoi tessellation of the node centres unioned by group and clipped to a smoothed hull. Our arrows, labels, port badges and colours stay exactly as they are; only the node shape and the backdrop change. The backdrop is an SVG layer under the nodes that pans and zooms with the viewport and recomputes when a node is dragged. Follows boards/project-backlog/29-svelte-flow-feature-parity.md.

## Checklist

- [ ] `style: "cards" | "sketch"` in the diagram options and panel
- [ ] Voronoi regions per group with d3-delaunay, unioned, clipped to a padded smoothed hull, dashed per subdomain, solid outer blob, labels at centroids
- [ ] Ellipse rendering of the existing node components in sketch style, with the same ports and content
- [ ] Unit coverage 100, e2e for the style toggle, stories
- [ ] Docs page update

## Comments

- **claude** (2026-09-03T09:00:00.000Z): Raised from the request for the familiar circular nodes and Voronoi-like regions. Delegated to a Fable subagent.
