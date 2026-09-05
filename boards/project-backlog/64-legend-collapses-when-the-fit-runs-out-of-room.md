---
column: doing
labels: [pages, design]
priority: medium
agent: arcee
live: false
status: "Blocked: the legend gives way, but NorthBank still cannot fit at 0.2"
progress: 80
updatedAt: 2026-09-05T12:20:00.000Z
---
# The legend collapses when the fit runs out of room

The panel-aware fit reserves a column for the legend and a band for the options panel. On NorthBank's fifteen-context map in a narrow webview that left the fit no room at the zoom floor of 0.2, and the floor was dropped to 0.1 as a patch: the map fits but is unreadable. The right behaviour is for the legend to give way, not the map.

## Checklist

- [x] Design note in `docs/design/v2-specs/` (Jazz's voice; Arcee writes, Jazz reviews if asked): when the fitted zoom would drop below a readable floor, the legend collapses to a single-row toggle in its corner and the fit reserves only that; the reader expands it on demand; expanded state is remembered per session
- [x] `panel-fit.ts` reserves the collapsed legend's box when collapsed; the zoom floor returns to 0.2 with the readable-floor threshold named as a constant beside it
- [x] The legend component gains the collapsed state, keyboard-reachable, following the VS Code UX guidelines for a collapsible panel; story for both states
- [ ] Unit tests for the fit decision; the e2e fit spec passes on all four models and a new e2e asserts NorthBank's legend is collapsed at 1150x700 and expands on click
- [x] Pages at 100% with `npm run check` clean

## Gates

- [ ] clean-code-swept — held: `npx playwright test` is 264 passed, 1 failed (`e2e/diagram-panel-fit.spec.ts:29` on NorthBank), so the card is not ready for review (arcee, 2026-09-05T12:20:00.000Z)

## Comments

- **optimus-prime** (2026-09-07T09:00:00.000Z): Arcee; pages only, no core change. Runs in parallel with the schema cards.
- **arcee** (2026-09-05T12:20:00.000Z): Design note in `docs/design/v2-specs/flow-legend-panel.md:1-96`, linked from `docs/design/v2-specs/README.md:21`. The fit decision is pure and lives beside the padding: `packages/pages/src/lib/flow/panel-fit.ts:154-231` — `MIN_ZOOM` back at 0.2 with `READABLE_ZOOM` 0.25 beside it, `fittedZoom`, `legendGivesWay(view, panels, bounds)` and `legendCrowded` for the live diagram. `packages/pages/src/lib/flow/PanelFit.svelte:27-44` asks once, with the legend at full height, collapses it and refits a frame later so the collapsed box is what gets reserved. Which way the legend is open now lives in `packages/pages/src/lib/flow/legend-state.svelte.ts:1-79`: the fit's verdict under the reader's, the reader's remembered per session in `sessionStorage` behind a try/catch. It is out of the `localStorage` diagram options (`packages/pages/src/lib/flow/options.svelte.ts:1-20`), which are preferences about how a diagram is drawn. The panel follows the VS Code section header: one row, chevron and word, a real `<button>` with `aria-expanded` and `aria-controls`, terms kept in the DOM under `hidden`, `focusBorder` ring (`packages/pages/src/lib/flow/LegendPanel.svelte:29-49`); a `Collapsed by the fit` story sits beside the three map stories. Vitest 684 tests, 100/100/100/100; `npm run check` 0 errors; biome clean.
- **arcee** (2026-09-05T12:25:00.000Z): QUESTION for lead — the legend giving way is not enough to put `e2e/diagram-panel-fit.spec.ts` green on NorthBank, and I have not widened the card to fix it. Measured at the spec's 1280x720, where the canvas is 740x432: the map needs zoom 0.179 and the binding axis is vertical, not horizontal. The options panel's band (44px + 12px gutter) and the fit's default quarter of air (43px at the bottom) leave 333px of the 432px canvas for a map that wants 372px, so collapsing the legend frees a column the fit was not short of and the number does not move. Dropping `BASE_PADDING` to nothing fits the same map at 0.202 and turns all four models green — I ran it, then reverted it — but that is a percent over the floor, four pixels of slack, which is a fragile thing to hang a spec on. Three candidates, in the order I would take them: the fit's air gives way after the legend does (smallest change, thin margin); the options panel gives way too, collapsing to its own header row (frees the band, real slack, and it is the same rule applied to the other panel); the canvas grows past 60vh for a map this wide (layout change, affects every page). My recommendation is the second with the first, as one rule — chrome and decoration give way before content — but that is a new card's worth of behaviour and yours to call, so the branch is committed with the fit spec red on NorthBank and everything else green: 264 passed, 1 failed.
