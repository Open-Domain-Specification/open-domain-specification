---
column: done
labels: [tooling]
priority: medium
agent: developer
live: false
updatedAt: 2026-09-29T16:20:39.000Z
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

- [x] `npx @biomejs/biome check` on the touched files exits 0 (root `biome check .`: no fixes, 2026-09-29)
- [x] `bash scripts/verify-all.sh` green on c3ae0910 (lead, 2026-09-29): core 1040, graphviz 35, doc 44, pages 906 at 100% coverage, pages e2e passed including `cross-surface-facts`, every model suite at its pinned count, schema comparison match

## Comments

- **developer** (2026-09-29T22:00:00.000Z): The bug was `packages/core/src/relation-map.ts:30-46`, where any `BoundedContext` became `external_context`. It now reads `bigBallOfMud` and `boundaryOnly` and returns `big_ball_of_mud_context` or `boundary_only_context`; external stays the fall-through. The union is at `relation-map.ts` (`ODSRelationMapNode.type`). The stereotype words are `packages/graphviz/src/role-labels.ts:78-81`, which both Graphviz/PlantUML (`packages/graphviz/src/relation-map.ts`) and pages (`packages/pages/src/lib/flow/relation-graph.ts:23-43`, chip in `RelationNode.svelte`) read. Words: "external system" and "boundary only" are the context map's own; the context map draws mud as the parenthetical "(big ball of mud)" because its box shape says the rest, so the relation map's UML stereotype form is «big ball of mud».
- **developer** (2026-09-29T22:00:00.000Z): Tests: `packages/core/src/derived-maps.test.ts:480` (each kind, plus a schema of the external and boundary-only ones), `packages/graphviz/src/relation-map.test.ts:186`, `packages/pages/src/lib/flow/relation-graph.test.ts:83`, `packages/pages/src/lib/flow/RelationNode.test.ts:76`. The mud and boundary-only core cases failed before the change (both read `external_context`). Nothing in `packages/doc` draws the relation map's stereotypes beyond the Graphviz SVG.
- **lead** (2026-09-29T23:30:00.000Z): Integrated on the epic 62 branch in the epic's order (#44, #43, #55, #56, then the cross-surface pass). The landing gate passed on c3ae0910, and `npm run test:vscode` passed on the same commit in real VS Code 1.96.4: cross-surface 4 passing, hostile-links 1, petstore 9 (4 pending screenshots). The mud stereotype reads «big ball of mud»: the relation map writes every node kind as a UML stereotype, so the kind's name matches the context map and only its notation differs. The card stays in `doing` until PR 73 merges.
- **lead** (2026-09-30T09:00:00.000Z): Landed. The owner reviewed PR #73 and merged it into develop as 9bb24cc, and post-merge CI run 36594778877 is green (test, e2e). Issue #56 closed; the card moves to `done`.
- **lead** (2026-09-29T16:20:39.000Z): Correction to the two lead entries above. They carry timestamps the lead wrote by hand, not the times the events happened. The entry stamped 2026-09-29T23:30:00.000Z was committed at 2026-09-29T15:35:38Z (commit 23fefaf). The entry stamped 2026-09-30T09:00:00.000Z was committed at 2026-09-29T16:11:34Z (commit a1eb80f). PR #73 merged at 2026-09-29T16:02:27Z, not on 2026-09-30. The entries stay as written; this entry and every later one use actual times.
