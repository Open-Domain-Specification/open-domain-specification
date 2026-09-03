---
column: todo
labels: [frontend]
priority: med
agent: dev-sonnet
updatedAt: 2026-09-03T15:00:00.000Z
---
# Floating handles by default on context diagrams

In interactive diagrams, edge handles currently default to `"fixed"` across all diagram types (`packages/pages/src/lib/flow/options.svelte.ts:29-34`). While fixed handles can be appropriate for strict UML class and relation diagrams, context diagrams represent strategic domain relationships between bounded contexts where floating handles provide substantially better visual clarity and readability.

## Context and Requirements

On context diagrams (particularly in the default sketch style), fixed handles pin edges to rigid cardinal attachment points (left, right, top, bottom). As nodes are arranged or dragged around to explore bounded context groupings, edges often wrap awkwardly around node bodies or cross through neighboring nodes.

Floating handles (`packages/pages/src/lib/flow/floating.ts:1-70` and `packages/pages/src/lib/flow/edge-path.ts:1-120`) dynamically compute the intersection between the connection line and the node's perimeter (ellipse or box), routing edges directly between the closest boundary points and placing port badges cleanly along the rim.

Context diagrams should default to `"floating"` handles so that newly opened context maps immediately look clean and natural, while continuing to allow users to toggle back to `"fixed"` via the options dropdown in packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:23-30.

## Implementation Details

- Update option defaults or diagram initialization so that `diagramKind(graph) === "context"` defaults `handles` to `"floating"` in packages/pages/src/lib/flow/options.svelte.ts:29-34 and packages/pages/src/lib/organisms/InteractiveDiagram.svelte:40-45.
- Preserve user preference persistence in localStorage (`ods-diagram-options`), allowing a per-diagram-kind preference or honoring an explicit user override.
- Ensure edge path calculation in packages/pages/src/lib/flow/edge-path.ts:1-120 and port badge placement in packages/pages/src/lib/flow/PortBadge.svelte render smoothly with floating handles across both sketch and card styles.

## Checklist

- [ ] Configure context diagrams to use `"floating"` handles by default in packages/pages/src/lib/flow/options.svelte.ts:29-34 and packages/pages/src/lib/organisms/InteractiveDiagram.svelte:40-45
- [ ] Maintain user override capability via packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:23-30
- [ ] Verify edge routing and port badge attachment for context maps in both `LR` and `TB` layouts
- [ ] Update diagram tests in packages/pages/src/lib/flow/ContextEdge.test.ts, packages/pages/src/lib/flow/options.test.ts, and e2e specs in packages/pages/e2e/diagrams.spec.ts

## Comments

- **jonathan** (2026-09-03T12:35:00.000Z): Raised issue to make floating handles the default on context diagrams. Floating handles attach dynamically to node boundaries and look much cleaner than fixed cardinal pins on organic context maps.
- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-sonnet. Fixed by decision: no Fullscreen API work here; card 14 handles that. Shape: in options.svelte.ts `DiagramOptions.handles` becomes optional in storage (absent = no user override); add `export function defaultHandles(kind): HandleMode` returning "floating" for "context" and "fixed" otherwise, and a store method `handlesFor(kind)` returning the override when set, else the default. InteractiveDiagram.svelte uses `diagramOptions.handlesFor(kind)`; DiagramOptionsPanel shows the effective value and `set({handles})` still writes a global override (one override for all kinds, that is enough). Existing localStorage values keep working. Tests that prove it: options.test.ts (default per kind, override wins, stored legacy value honoured), ContextEdge.test.ts if it asserts handle mode, and one e2e assertion in e2e/diagrams.spec.ts that a fresh context map renders floating edges (check how the existing spec detects the handle mode). Coverage must stay 100%. Card 13 touches InteractiveDiagram.svelte too on one prop; card 14 touches the options panel later; keep your edits minimal in both. Work in your worktree; `npm ci` there first if node_modules is missing.
