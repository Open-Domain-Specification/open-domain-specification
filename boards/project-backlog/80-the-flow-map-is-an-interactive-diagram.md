---
column: todo
labels: [pages, design]
priority: medium
agent: arcee
updatedAt: 2026-09-08T00:20:00.000Z
---
# The flow map is an interactive diagram

Card 60 found that `packages/pages` draws context, consumable and relation maps as Svelte Flow diagrams but no flow map: policies and processes, the model's reactions, exist only in the graphviz renderer and the generated docs. A reader of the pages cannot see what wakes a process or what it issues without leaving the page. The flow map becomes the fourth interactive diagram, in the design language, with the same panels, legend, fit and disclosure the other three have.

## Checklist

- [ ] Design note in `docs/design/v2-specs/` (Arcee writes, Jazz reviews if asked): node shapes for operation, event, policy and process; the dashed `ends` edge; how a process's lifecycle reads at a glance; where the diagram appears (context page, process page, policy page)
- [ ] `packages/pages/src/lib/flow/flow-graph.ts` builds the graph from `ODSFlowMap`; node components and edges in the registry; legend rows; the fit and panel behaviour reused, not copied
- [ ] Context page, policy page and process page embed it; stories for each node kind and for a process with start and end events; tests; pages at 100% with `npm run check` clean
- [ ] The e2e diagram specs gain a flow map case in the shape of the consumable map's

## Comments

- **optimus-prime** (2026-09-08T00:20:00.000Z): Arcee, after card 79 lands (the lead will say); pages only. Ask Jazz for the node shapes if the design language does not already settle them.
