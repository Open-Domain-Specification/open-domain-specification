---
column: todo
labels: [pages, graphviz, design]
priority: low
agent: bumblebee-lite
updatedAt: 2026-09-07T11:30:00.000Z
---
# Attribute marks and panel stories: small leftovers from cards 58 and 64

Two leftovers from card 58. The graphviz relation map draws an attribute row as `{id} name: type` and does not mark an optional attribute; `{opt}` beside `{id}` is the UML-shaped answer. The pages attribute table still renders `identifies` as a bespoke span in the secondary colour where the v2 design language would use a `Keyword` plus the `Ref`.

## Checklist

- [ ] `packages/graphviz/src/relation-map.ts` prints `{opt}` for an optional attribute in DOT and PlantUML; test
- [ ] `DiagramOptionsPanel` gains a `.stories.svelte` with its expanded and collapsed states, matching the legend's; `docs/design/v2-specs/organism-interactive-diagram.md` reconciled with `flow-diagram-panels.md` on the panels' frame
- [ ] `AttributeTable.svelte` renders `identifies` as `Keyword` + `Ref` in the design language; story and test updated; pages at 100% with `npm run check` clean

## Comments

- **optimus-prime** (2026-09-07T11:30:00.000Z): Bumblebee-lite, whenever a worktree is free; no core change.
