---
status: Accepted
date: 2026-09-02
---
# Decision 10 — UML notation for non-DDD diagrams, rendered with Graphviz, not PlantUML

## Current position (2026-09-10)

Stable. Graphviz is the only renderer, the relation map is a UML class diagram with `toPlantUML()` as text output, and PlantUML rendering stays ruled out; no amendment touches this record. Decision 12's amendment moved the pages to a Svelte app that renders Graphviz in the browser, which keeps the in-process, offline constraint this record set.

The relation map has since gained notation from other records: a dashed identity edge across a boundary, drawn to the entity named, child or root, or to an external context or its published schema (decision 14, cards 54, 67 and 81; decision 28, card 113); a borrowed value object with its context named (decision 16, card 93); a value-object line derived from the attribute, a declared `uses` relation adding only a label or cardinality (decision 16, card 104); and a hollow-triangle generalisation for `specialises` (decision 22). The context map gained the «id» implied edge (decision 14, card 70) and an external stereotype (decision 28).

## Context

The four generated diagrams split into two kinds. Context maps, consumable
maps and flow maps carry DDD-specific notation (upstream and downstream
roles, big ball of mud, event to policy to operation chains) that no standard
diagram language covers. The relation map, which draws entities, value objects
and their relations, is a UML class diagram in all but styling: it showed a
bare name per node, nested five namespace clusters around each aggregate, and
used ad hoc arrowheads.

PlantUML was assessed as a renderer. Every consumer renders in-process and
offline: the VS Code extension bundles the Graphviz wasm in its extension
host, the doc generator emits SVG during a Node build, and the docs site
renders in the browser. PlantUML needs a JVM, a network server, or a CheerpJ
runtime of tens of megabytes loaded from a CDN. None of those fit, and PlantUML
delegates class diagram layout to Graphviz dot anyway.

## Decision

Where DDD has no notation of its own, adopt UML notation, and keep Graphviz as
the only renderer. The relation map becomes a UML class diagram: HTML-like
node labels with a stereotype and name header and an attribute compartment,
identity attributes marked `{id}`, UML arrows (open arrowhead association for
`references`, filled diamond composition for `includes`, dashed open arrowhead
dependency for `uses`), cardinality at the target end and one cluster per
aggregate labelled with its context path. The relation map also exposes
`toPlantUML()` so users with their own PlantUML tooling can consume the same
model as text. Shared visual settings move into a theme module in the graphviz
package. The DDD maps keep their custom notation.

## Consequences

- No new runtime dependency and no network call; the wasm footprint stays at
  1.6 MB across Node, the browser and the extension host.
- The relation map needs attributes on its nodes, so the core relation map node
  type gains an `attributes` list.
- Rendering PlantUML in this repo is ruled out. Anyone who wants PlantUML output
  takes the text and renders it with their own tooling.
- Diagram snapshots for the relation map change.
