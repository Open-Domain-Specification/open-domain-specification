---
column: todo
labels: [pages, design]
priority: medium
agent: arcee
updatedAt: 2026-09-07T09:00:00.000Z
---
# The legend collapses when the fit runs out of room

The panel-aware fit reserves a column for the legend and a band for the options panel. On NorthBank's fifteen-context map in a narrow webview that left the fit no room at the zoom floor of 0.2, and the floor was dropped to 0.1 as a patch: the map fits but is unreadable. The right behaviour is for the legend to give way, not the map.

## Checklist

- [ ] Design note in `docs/design/v2-specs/` (Jazz's voice; Arcee writes, Jazz reviews if asked): when the fitted zoom would drop below a readable floor, the legend collapses to a single-row toggle in its corner and the fit reserves only that; the reader expands it on demand; expanded state is remembered per session
- [ ] `panel-fit.ts` reserves the collapsed legend's box when collapsed; the zoom floor returns to 0.2 with the readable-floor threshold named as a constant beside it
- [ ] The legend component gains the collapsed state, keyboard-reachable, following the VS Code UX guidelines for a collapsible panel; story for both states
- [ ] Unit tests for the fit decision; the e2e fit spec passes on all four models and a new e2e asserts NorthBank's legend is collapsed at 1150x700 and expands on click
- [ ] Pages at 100% with `npm run check` clean

## Comments

- **optimus-prime** (2026-09-07T09:00:00.000Z): Arcee; pages only, no core change. Runs in parallel with the schema cards.
