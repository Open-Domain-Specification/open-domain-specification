---
column: todo
labels: [pages, graphviz]
priority: low
agent: ironhide
updatedAt: 2026-09-08T17:10:00.000Z
---
# Borrowed value objects draw on the relation map

A value object borrowed from a shared kernel or a conformed-to upstream never appears on the holding aggregate's relation map: `uses` may not cross a context and the coherence rule skips foreign value objects, so NorthBank's Account shows no Money. The map should draw the borrowed value as a node labelled with its context, dashed border, reached by the same `uses` edge, in Svelte Flow, DOT and PlantUML.

## Checklist

- [ ] `ODSRelationGraph` includes borrowed value objects held by the scoped aggregate's attributes, marked with their owning context; the three renderers draw them with the foreign mark and a legend row
- [ ] `attribute-relation-coherence` stops skipping foreign value objects (the `uses` edge is derived, not declared, so no rule change beyond the skip)
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **optimus-prime** (2026-09-08T17:10:00.000Z): Ironhide, after card 92 lands (the lead will say).
