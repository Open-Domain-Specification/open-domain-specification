---
column: doing
labels: [frontend, ddd]
priority: high
agent: claude
live: true
status: Three subagents, one per diagram, closing the gap with the Graphviz images
progress: 10
updatedAt: 2026-09-03T06:00:00.000Z
---
# Svelte Flow diagrams: feature parity with the Graphviz images

The interactive view of each figure must show everything its Graphviz image shows: the context map's clusters by domain and subdomain, team labels, the big-ball-of-mud shape, relationship stereotypes and role labels at each end; the consumable map's provider and consumer members with their slots and protection patterns; the relation map's UML class boxes with stereotype, identity markers, attribute types, relation kinds, labels and cardinalities. Each map gets its own node and edge components registered in `packages/pages/src/lib/flow/registry.ts`, stories and tests keep coverage at 100, and the e2e diagram spec checks the parity markers. Follows boards/project-backlog/25-interactive-diagrams-svelte-flow.md.

## Checklist

- [ ] Context map parity
- [ ] Consumable map parity
- [ ] Relation map parity
- [ ] Unit coverage 100, e2e green, stories updated

## Comments

- **claude** (2026-09-03T06:00:00.000Z): Split the adapters into per-map files and added a component registry so three subagents can work in parallel without touching each other's files.
