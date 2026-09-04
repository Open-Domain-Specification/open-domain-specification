---
column: review
labels: [bug, frontend]
priority: med
agent: dev-opus
live: false
clean-code-swept: true
updatedAt: 2026-09-05T04:10:00.000Z
---
# Legend panel overlaps the Catalog node on the petstore context map

In the petstore commerce context map the legend panel (top-left) sits on top of the Catalog BC ellipse at the default fit. Seen in apps/ods-vscode/media/screenshots/context-map-dark.png and flagged in the RFC-001 product review. Either fit the view with padding that accounts for the panels, or collapse the legend by default when it would cover a node.

## Checklist

- [x] Reproduce with a Playwright screenshot of the petstore commerce context map
- [x] Fix so no node is covered at the default fit on the four reference models
- [x] E2e assertion that the legend's box does not intersect any node's box after fit

## Gates

- [x] qa-automated — after merging develop: pages 676 at 100%, panel-fit, sketch and context e2e 9/9; developer measured 0 covered nodes on all four models (lead, 2026-09-05T04:10:00Z)

- [x] clean-code-swept — six-principle audit over the changed files; one finding above 0.5 (COUPLING 0.55: `panel-fit.ts` found the panels by a hard-coded class string the two panel components declared independently) fixed by exporting `LEGEND_PANEL_CLASS`/`OPTIONS_PANEL_CLASS` from `packages/pages/src/lib/flow/panel-fit.ts:105-114` and using them in `LegendPanel.svelte:23` and `DiagramOptionsPanel.svelte:42`; nothing else scored above 0.5 (dev-opus, 2026-09-04T11:10:00.000Z)

## Comments

- **lead** (2026-09-05T00:30:00.000Z): Assigned to dev-opus. Fixed by decision: fit the view so no node sits under the legend or the options panel at the default zoom, measured after mount (the panels' boxes are known; pad the fitView bounds on the side each panel occupies, or shift the viewport by the panel's width plus a gutter after fitView). Do not collapse the legend by default. Apply to context, consumable and relation maps. Test: an e2e case over the four reference models' workspace context maps asserting no node bounding box intersects the legend or options panel; the pages unit suite at 100%. Work in your worktree with absolute paths; build core, graphviz and pages first; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.

- **dev-opus** (2026-09-04T00:00:00.000Z): Picked this up. The fit lives on `packages/pages/src/lib/organisms/InteractiveDiagram.svelte:66` (`fitView fitViewOptions={{ padding: 0.25 }}`); the two panels are `packages/pages/src/lib/flow/LegendPanel.svelte:22` (top-left) and `packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:38` (top-right). Reading the xyflow fit options to see whether per-side padding is available before writing the measure-after-mount refit.

- **dev-opus** (2026-09-04T09:40:00.000Z): Per-side padding is available: `@xyflow/system` 0.0.82 parses `padding` as `{top,right,bottom,left}` with `<n>px` values and, once clamped, shifts the viewport to honour the asymmetry (`node_modules/@xyflow/system/dist/esm/index.mjs:658-745`). So the fix is the card's first option — measure the panels after mount and refit with their strips reserved. New pure module `packages/pages/src/lib/flow/panel-fit.ts:1-160`: `panelPadding` turns the canvas box and the panel boxes into that padding, `fitPastPanels` measures `.diagram-legend, .diagram-options` inside the diagram and calls `fitView`. `packages/pages/src/lib/flow/PanelFit.svelte:1-30` runs it once from inside Svelte Flow, a tick and two frames after mount so it lands after Svelte Flow's own initial fit; `packages/pages/src/lib/organisms/InteractiveDiagram.svelte:59-77` binds the figure's box and mounts it, which covers context, consumable and relation maps alike. The fullscreen refit goes through the same helper (`packages/pages/src/lib/flow/DiagramOptionsPanel.svelte:71`), so the overlay is fitted the same way.

- **dev-opus** (2026-09-04T10:20:00.000Z): Reserving a full-height column for each panel — the card's wording — does not work at the size the figure is actually drawn: on the docs page the canvas is 738x432 while the legend is 217 wide and the options panel 455, so both columns leave 148px for the map and the fit hits `minZoom` 0.2 on all four models (measured with a throwaway spec). A panel is equally cleared by the band it hugs, so `panel-fit.ts:74-120` now gives each panel whichever strip is the smaller share of its axis: the tall narrow legend takes its column, the wide flat options panel takes its top band. Petstore then fits at 0.36 rather than being clamped. Flagging it for the lead as the one place I went past the card's wording — the rule it states ("no node under a panel") still holds, the strip chosen to satisfy it differs.

- **dev-opus** (2026-09-04T10:40:00.000Z): Evidence. Baseline, with `<PanelFit>` commented out and the app rebuilt, nodes covered at the default fit: petstore 1 of 5 (the Catalog BC of the card), rivermart 2 of 14, streamline 4 of 13, northbank 1 of 14. With the refit in: 0 on all four, screenshots under `/private/tmp/claude-501/<model>-map.png`. The regression test is `packages/pages/e2e/diagram-panel-fit.spec.ts:29-56`, one case per reference model, polling until no `.svelte-flow__node` box intersects a panel box; `packages/pages/e2e/helpers.ts:60-92` gained `REFERENCE_MODELS` and `serveModel` so a spec can open any of the four workspaces in the viewer. Unit side: `packages/pages/src/lib/flow/panel-fit.test.ts:1-125` (10 cases, the geometry) and `packages/pages/src/lib/flow/PanelFit.test.ts:1-45` (the refit fires after mount, and not after teardown). Full pages unit suite 674 passed, 111 files, `panel-fit.ts` and `PanelFit.svelte` at 100% lines/branches/functions with the package's thresholds unchanged.

- **dev-opus** (2026-09-04T11:15:00.000Z): One existing e2e case needed adjusting: `packages/pages/e2e/diagrams-sketch.spec.ts:134-141` dragged a node a fixed 500x300px to prove the cluster boxes follow it, and asserted the box grew by 200px. The default fit is now zoomed out further to leave the panels their room (petstore 0.41 where it was ~0.6), so 500 screen pixels no longer carries the node past the cluster's edge — the drag now aims at a point 250x150 beyond the cluster's own corner, which is what the test meant and is zoom-independent. Behaviour it covers is unchanged. Final runs after the clean-code sweep: `npx vitest run --coverage` 674 passed / 111 files, all files 100%; `npx playwright test` 233 passed; `svelte-check` 0 errors over 1027 files; biome clean on every file I touched. Left in `review` for the lead — nothing committed.
- **lead** (2026-09-05T04:10:00.000Z): The band-per-panel padding is accepted as the reading of the rule. Landing on develop.
