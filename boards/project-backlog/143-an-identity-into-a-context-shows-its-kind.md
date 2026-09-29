---
column: doing
labels: [tooling]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-29T22:00:00.000Z
---
# An identity into a context shows its kind

Issue #56, a child of epic #62. The relation map drew every context-valued identity target as an external system, whatever the context was, so a big ball of mud and a boundary-only context of ours were both mislabelled. The epic's instruction is to correct it with fixtures for external, boundary-only and big-ball-of-mud targets, plus any other context kinds the current model supports; the acceptance is that identity-target stereotypes match the source model. No metamodel change: the kind is a fact the context already carries.

## Checklist

- [x] Enumerate the context kinds an identity may name (`identifies-entity`): external, boundary-only, big ball of mud; an ordinary context is refused, and the three flags are mutually exclusive
- [x] Failing tests first: core relation-map node kind, graphviz box and PlantUML stereotype, pages node data and rendered stereotype
- [x] Core carries the kind on the relation-map node
- [x] Graphviz and pages read the kind through the shared stereotype table
- [x] Schema targets (external and boundary-only publish them) land on a box of the same kind
- [x] Pages coverage stays at 100%; core, graphviz and doc suites and `npm run check` green
- [x] Petstore and clinic rebuilt: no change to `docs/` or `.ods`, diagnostics unchanged (0)

## Gates

- [ ] `npx @biomejs/biome check` on the touched files exits 0
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **developer** (2026-09-29T22:00:00.000Z): The bug was `packages/core/src/relation-map.ts:30-46`, where any `BoundedContext` became `external_context`. It now reads `bigBallOfMud` and `boundaryOnly` and returns `big_ball_of_mud_context` or `boundary_only_context`; external stays the fall-through. The union is at `relation-map.ts` (`ODSRelationMapNode.type`). The stereotype words are `packages/graphviz/src/role-labels.ts:78-81`, which both Graphviz/PlantUML (`packages/graphviz/src/relation-map.ts`) and pages (`packages/pages/src/lib/flow/relation-graph.ts:23-43`, chip in `RelationNode.svelte`) read. Words: "external system" and "boundary only" are the context map's own; the context map draws mud as the parenthetical "(big ball of mud)" because its box shape says the rest, so the relation map's UML stereotype form is «big ball of mud».
- **developer** (2026-09-29T22:00:00.000Z): Tests: `packages/core/src/derived-maps.test.ts:480` (each kind, plus a schema of the external and boundary-only ones), `packages/graphviz/src/relation-map.test.ts:186`, `packages/pages/src/lib/flow/relation-graph.test.ts:83`, `packages/pages/src/lib/flow/RelationNode.test.ts:76`. The mud and boundary-only core cases failed before the change (both read `external_context`). Nothing in `packages/doc` draws the relation map's stereotypes beyond the Graphviz SVG.
