---
column: review
labels: [frontend, ddd]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-09-03T14:00:00.000Z
---
# Sketch only for the context map, domain borders, and proper UML for the other two maps

Three changes to the interactive diagrams. First, the sketch style applies to the DDD context map only: the style control is hidden on the other maps. On the context map nodes can be dragged outside their cluster and the backdrop follows. The backdrop's regions are subdomains; a domain is the union of its neighbouring subdomain regions, drawn with a thicker border and a label that runs along the border line in the style of map boundary labels, and the layout keeps a domain's subdomains adjacent. Second, the consumable map becomes a proper UML component diagram: «component» boxes with the component icon, provided interfaces as lollipops and required interfaces as sockets, assembly connectors between them, patterns as the port labels. Third, the relation map becomes a proper UML class diagram: class compartments, stereotypes, composition, aggregation, association and dependency markers per relation kind, navigability and multiplicities at the ends. Arrows, labels, port badges and colours from the current diagrams stay where UML allows. Follows boards/project-backlog/30-voronoi-sketch-style.md.

## Checklist

- [x] Style select shown only for the context map; sketch never applied to the other two
- [x] Context map: nodes free to leave their cluster; backdrop recomputes
- [x] Domain regions: union of subdomain Voronoi regions, thick border, label along the border path; layout keeps subdomains of a domain adjacent
- [x] Consumable map as a UML component diagram
- [x] Relation map as a UML class diagram
- [x] Legend panel top-left listing only the abbreviations, stereotypes, line styles and node marks present in the diagram, collapsible
- [x] Edges twice as thick and animated, markers scaled to match
- [x] Edge colour contrasts with cluster shading in both themes (consumable map lines were too dim)
- [x] Unit coverage 100, e2e updated, stories, docs

## Gates

- [x] clean-code-swept — reviewer sweep; four findings fixed: Voronoi cells computed once per backdrop, sketch data only on context nodes, legend names typed against the core unions, hasSketchStyle predicate; 344 unit tests at 100 coverage, 35 e2e, root green (claude, 2026-09-03T14:00:00.000Z)

## Comments

- **claude** (2026-09-03T11:00:00.000Z): Raised from the request after the sketch style landed. Delegated to a Fable subagent.
- **claude** (2026-09-03T14:30:00.000Z): Done. `flow/kind.ts` derives the map kind from the graph; the style select and sketch backdrop are context-only and context nodes have no parent extent. `voronoi.ts` adds domain borders (Voronoi edges between different domains, thick solid) with the domain name on a `textPath` along the longest straight segment, on the domain's side. ConsumableNode is a «component» with lollipop target handles and socket source handles, edges are assembly connectors (no arrowhead); RelationNode has three compartments and includes carries "1" at the whole. Added `flow/legend.ts` + `LegendPanel.svelte`, `flow-nodes.ts` (pure node/edge building), edge stroke 2px in `--fg` at 0.7 with every edge animated. Layout test asserts each domain's cells form one connected region. Aggregation omitted: the core has no such relation.
- **claude** (2026-09-03T14:00:00.000Z): Two user-reported bugs fixed by Sonnet subagents. Edge animation skipped because our dash patterns no longer matched Svelte Flow's keyframe travel; packages/pages/assets/page.css now pairs each pattern with its own keyframes at equal length, with a `dashed` class replacing inline dash styles (packages/pages/src/lib/flow/flow-nodes.ts, RelationEdge.svelte); confirmed continuous by sampling the live dash offset. Ports were connectable and showed a crosshair; every handle is now `isConnectable={false}` (packages/pages/src/lib/flow/NodeHandles.svelte), the flow is not connectable or selectable, and handles are inert with the node's pointer cursor. Sweep findings applied and gate recorded.
