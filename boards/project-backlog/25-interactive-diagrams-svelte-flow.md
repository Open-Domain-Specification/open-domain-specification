---
column: todo
labels: [frontend, ddd]
priority: med
updatedAt: 2026-09-02T18:20:00.000Z
---
# Interactive diagrams with Svelte Flow

Add `@xyflow/svelte` to the pages library and offer an interactive view beside each static Graphviz figure: the context map, the consumable map and the aggregate relation map become pannable, zoomable node graphs with auto layout, where clicking a node navigates to its element. The Graphviz SVG stays as the default and for export to images. Depends on boards/project-backlog/24-browser-viewer-replaces-ods-ui.md. See decisions/12-one-renderer-three-hosts.md.

## Checklist

- [ ] Map the core map models (`ODSContextMap`, `ODSConsumableMap`, `ODSRelationMap`) to Svelte Flow nodes and edges with auto layout
- [ ] `InteractiveDiagram` organism with custom node components styled like the pages, and a toggle in `DiagramFigure`
- [ ] Node click navigates by ref; edge labels carry relationship and cardinality
- [ ] Stories for each map on the petstore example
- [ ] Docs page update
