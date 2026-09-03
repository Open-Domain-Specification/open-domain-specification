---
column: review
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Add upstream/downstream direction and Big Ball of Mud marker to the context map

The context map has no explicit upstream/downstream direction and no way to mark a legacy Big Ball of Mud context. Depends on the explicit relationship model in card 05.

## Checklist

- [x] Add direction to relationship edges
- [x] Add a `bigBallOfMud` (or similar) flag on BoundedContext
- [x] Render direction arrows and BBoM styling in packages/graphviz/src/context-map.ts

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T12:11:46.000Z): Direction landed with card 05 (directed edges carry upstream/downstream and graphviz draws the arrow only for directed types). This card adds the bigBallOfMud flag: packages/core/src/schema.ts:22-27, model attribute and toSchema in packages/core/src/workspace.ts:455-590, carried on ODSContextMapNode (packages/core/src/context-map.ts:18-25,150-156). Graphviz draws a muddy dashed double-octagon via nodeAttributes (packages/graphviz/src/context-map.ts:41-55); UI shows a red badge on the context page (apps/ods-ui/src/pages/BoundedContextPage.tsx:30-35); doc page gets a warning banner (packages/doc/src/boundedcontext.md.ts:32). Petstore marks Identity BC. Build and 104 tests green, examples regenerated. Six-agent audit: nothing above 0.5.
