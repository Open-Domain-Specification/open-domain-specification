---
column: backlog
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-02T12:00:00.000Z
---
# Add upstream/downstream direction and Big Ball of Mud marker to the context map

The context map has no explicit upstream/downstream direction and no way to mark a legacy Big Ball of Mud context. Depends on the explicit relationship model in card 05.

## Checklist

- [ ] Add direction to relationship edges
- [ ] Add a `bigBallOfMud` (or similar) flag on BoundedContext
- [ ] Render direction arrows and BBoM styling in packages/graphviz/src/context-map.ts
