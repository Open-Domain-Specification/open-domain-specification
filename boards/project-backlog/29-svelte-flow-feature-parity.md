---
column: review
labels: [frontend, ddd]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-09-03T09:00:00.000Z
---
# Svelte Flow diagrams: feature parity with the Graphviz images

The interactive view of each figure must show everything its Graphviz image shows: the context map's clusters by domain and subdomain, team labels, the big-ball-of-mud shape, relationship stereotypes and role labels at each end; the consumable map's provider and consumer members with their slots and protection patterns; the relation map's UML class boxes with stereotype, identity markers, attribute types, relation kinds, labels and cardinalities. Each map gets its own node and edge components registered in `packages/pages/src/lib/flow/registry.ts`, stories and tests keep coverage at 100, and the e2e diagram spec checks the parity markers. Follows boards/project-backlog/25-interactive-diagrams-svelte-flow.md.

## Checklist

- [x] Context map parity
- [x] Consumable map parity
- [x] Relation map parity
- [x] Unit coverage 100, e2e green, stories updated
- [x] Review sweep applied; large port handles carrying the role abbreviation

## Gates

- [x] clean-code-swept — reviewer sweep of the diagram code; all eight findings applied: label tables owned once by the graphviz package, shared edge-path helper, global diagram CSS including the missing hidden-handle rule, NodeHandles and NodeHead components, dead generic node and edge removed, groupPath rename, shared test harnesses and mock; 303 unit tests at 100 coverage, 33 e2e, root green (claude, 2026-09-03T09:00:00.000Z)

## Comments

- **claude** (2026-09-03T06:00:00.000Z): Split the adapters into per-map files and added a component registry so three subagents can work in parallel without touching each other's files.
- **claude** (2026-09-03T08:00:00.000Z): Three Fable subagents delivered parity in parallel, one per map, each owning its own adapter, node and edge components (packages/pages/src/lib/flow/ContextNode.svelte, ContextEdge.svelte, ConsumableNode.svelte, ConsumableEdge.svelte, RelationNode.svelte, RelationEdge.svelte) registered in packages/pages/src/lib/flow/registry.ts. A fourth pass closed the shared gaps: namespace clusters are real Svelte Flow group nodes laid out with dagre compound graphs (packages/pages/src/lib/flow/layout.ts, ClusterNode.svelte), handle ids flow through the shared edge builder, and consumable slots carry their kind from core (packages/core/src/consumable-map.ts). Checked by eye from a built export: the context map shows nested shaded clusters, team labels, the big-ball-of-mud octagon, stereotypes and role abbreviations at each end; the consumable map shows provider slots with patterns and per-slot edge attachment; the relation map shows UML boxes with stereotypes, identity markers, types, a per-aggregate cluster, dashed uses, references arrows, labels and cardinalities. 299 unit tests at 100 coverage, 33 e2e. A review sweep found label tables copied three times, edge path logic copied four times, dead generic node and edge components, and a missing global rule for hidden handles; a subagent is applying those fixes together with the request for large port handles showing the role abbreviation.
- **claude** (2026-09-03T09:00:00.000Z): Sweep and port badges landed. Label tables live in packages/graphviz/src/role-labels.ts and are imported by the three adapters; packages/pages/src/lib/flow/edge-path.ts holds the shared endpoint and path logic plus port geometry; packages/pages/assets/page.css has an interactive-diagrams section including the global hidden-handle rule that was missing in production. Ports: packages/pages/src/lib/flow/PortBadge.svelte draws 22px pills at edge ends with the role abbreviation and a full-name tooltip, consumable slot handles are enlarged and labelled with the provider pattern (packages/pages/src/lib/flow/NodeHandles.svelte), and paths are shortened so lines start at the rim. Checked by eye on the context and consumable maps from a built export.
