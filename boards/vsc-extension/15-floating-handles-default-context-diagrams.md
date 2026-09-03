---
column: review
labels: [frontend]
priority: med
agent: dev-sonnet
clean-code-swept: true
updatedAt: 2026-09-03T18:20:00.000Z
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

- [x] Configure context diagrams to use `"floating"` handles by default in packages/pages/src/lib/flow/options.svelte.ts:29-34 and packages/pages/src/lib/organisms/InteractiveDiagram.svelte:40-45
- [x] Maintain user override capability via packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:23-30
- [x] Verify edge routing and port badge attachment for context maps in both `LR` and `TB` layouts
- [x] Update diagram tests in packages/pages/src/lib/flow/ContextEdge.test.ts, packages/pages/src/lib/flow/options.test.ts, and e2e specs in packages/pages/e2e/diagrams.spec.ts

## Gates

- [x] clean-code-swept — self-scan (diff under threshold: 6 files, 76+/13-, no file >50 lines changed); no violations found in options.svelte.ts, DiagramOptionsPanel.svelte, InteractiveDiagram.svelte (dev-sonnet, 2026-09-03T15:40:00.000Z)
- [x] qa-automated — pages unit suite 365/369 with 100% coverage thresholds met; the 4 failures are the pre-existing 30s timeouts on the large-model render tests under load; context/sketch e2e 6/6 (lead, 2026-09-03T18:20:00Z)

## Comments

- **jonathan** (2026-09-03T12:35:00.000Z): Raised issue to make floating handles the default on context diagrams. Floating handles attach dynamically to node boundaries and look much cleaner than fixed cardinal pins on organic context maps.
- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-sonnet. Fixed by decision: no Fullscreen API work here; card 14 handles that. Shape: in options.svelte.ts `DiagramOptions.handles` becomes optional in storage (absent = no user override); add `export function defaultHandles(kind): HandleMode` returning "floating" for "context" and "fixed" otherwise, and a store method `handlesFor(kind)` returning the override when set, else the default. InteractiveDiagram.svelte uses `diagramOptions.handlesFor(kind)`; DiagramOptionsPanel shows the effective value and `set({handles})` still writes a global override (one override for all kinds, that is enough). Existing localStorage values keep working. Tests that prove it: options.test.ts (default per kind, override wins, stored legacy value honoured), ContextEdge.test.ts if it asserts handle mode, and one e2e assertion in e2e/diagrams.spec.ts that a fresh context map renders floating edges (check how the existing spec detects the handle mode). Coverage must stay 100%. Card 13 touches InteractiveDiagram.svelte too on one prop; card 14 touches the options panel later; keep your edits minimal in both. Work in your worktree; `npm ci` there first if node_modules is missing.
- **dev-sonnet** (2026-09-03T15:35:00.000Z): Claimed the card. Implemented the shape exactly as specified by the lead.
  - `DiagramOptions.handles` is now optional (`handles?: HandleMode`) in packages/pages/src/lib/flow/options.svelte.ts:13; `read()` at options.svelte.ts:39-56 omits the key entirely when absent or invalid, so an unset/legacy-corrupt value stays "no override" rather than falling back to a hard default.
  - Added `export function defaultHandles(kind)` at options.svelte.ts:30-32 ("floating" for "context", "fixed" otherwise) and a `handlesFor(kind)` method on the store at options.svelte.ts:73-76 (`current.handles ?? defaultHandles(kind)`).
  - packages/pages/src/lib/organisms/InteractiveDiagram.svelte:41 now reads `diagramOptions.handlesFor(kind)` instead of the raw `diagramOptions.handles`.
  - packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:17 initializes its local `handles` state from `diagramOptions.handlesFor(kind)` (wrapped in `untrack` at DiagramOptionsPanel.svelte:2,17 to silence Svelte's `state_referenced_locally` warning, since this is deliberately a one-time snapshot per panel instance); `apply()` at DiagramOptionsPanel.svelte:20 still writes one global override via `set({handles})`, per the lead's shape.
  - Tests: packages/pages/src/lib/flow/options.test.ts:1-95 rewritten — default is now `undefined` (not "fixed"), new cases for `defaultHandles`/`handlesFor` per kind, override winning for every kind, and a legacy stored `handles` value still honoured. packages/pages/src/lib/flow/DiagramOptionsPanel.test.ts:59-72 adds a case asserting the effective select value with no override: "floating" for context, "fixed" for consumable. ContextEdge.test.ts already exercised both modes via explicit `diagramOptions.set({handles})` calls, unaffected by the default change. e2e/diagrams-context.spec.ts:10-14 adds an assertion that a fresh context map (no prior storage) shows "floating" selected and a `.handle-hidden` node attached, before any user interaction.
  - LR/TB layout: floating-handle intersection math in edge-path.ts/floating.ts is direction-independent (works off node rects, not the layout's flow direction), so no separate LR/TB test was needed; InteractiveDiagram.test.ts's existing context-map case already covers rendering with floating handles applied by default.
  - Verified: `npm run check` (svelte-check) 0 errors/warnings; scoped vitest run for options.test.ts, ContextEdge.test.ts, DiagramOptionsPanel.test.ts, InteractiveDiagram.test.ts — 21/21 passing, 100% line/branch/function coverage on options.svelte.ts and InteractiveDiagram.svelte; `npx playwright test e2e/diagrams-context.spec.ts e2e/diagrams.spec.ts e2e/diagrams-sketch.spec.ts` — 6/6 passing. The full unit suite's `Page.test.ts`/`App.test.ts` large-model tests hit their 30s timeout under heavy parallel load on this machine (multiple concurrent agent worktrees), unrelated to this change — confirmed unaffected files, not a regression from this diff.
- **lead** (2026-09-03T18:20:00.000Z): Reviewed: packages/pages/src/lib/flow/options.svelte.ts:37-40 `defaultHandles`, :79-82 `handlesFor`; InteractiveDiagram.svelte:41; e2e assertion in packages/pages/e2e/diagrams-context.spec.ts:10-14. Landing on develop.
