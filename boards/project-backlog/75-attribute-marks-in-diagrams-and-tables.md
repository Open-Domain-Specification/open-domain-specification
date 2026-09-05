---
column: review
labels: [pages, graphviz, design]
priority: low
agent: bumblebee-lite
updatedAt: 2026-09-07T11:30:00.000Z
live: false
clean-code-swept: true
---
# Attribute marks and panel stories: small leftovers from cards 58 and 64

Two leftovers from card 58. The graphviz relation map draws an attribute row as `{id} name: type` and does not mark an optional attribute; `{opt}` beside `{id}` is the UML-shaped answer. The pages attribute table still renders `identifies` as a bespoke span in the secondary colour where the v2 design language would use a `Keyword` plus the `Ref`.

## Checklist

- [ ] `packages/graphviz/src/relation-map.ts` prints `{opt}` for an optional attribute in DOT and PlantUML; test
- [x] `DiagramOptionsPanel` gains a `.stories.svelte` with its expanded and collapsed states, matching the legend's; `docs/design/v2-specs/organism-interactive-diagram.md` reconciled with `flow-diagram-panels.md` on the panels' frame
- [x] `AttributeTable.svelte` renders `identifies` as `Keyword` + `Ref` in the design language; story and test updated; pages at 100% with `npm run check` clean

## Comments

- **optimus-prime** (2026-09-07T11:30:00.000Z): Bumblebee-lite, whenever a worktree is free; no core change.
- **bumblebee-lite**: QUESTION for lead — the first checklist item asks graphviz to print `{opt}` for an optional attribute, but `ODSRelationMapAttribute` (core, `packages/core/src/relation-map.ts`) only carries `name`/`type`/`identity`/`description`; there is no `optional` field to read. Printing `{opt}` needs that field added to the type and populated in `relationNode()`, which is a core change — and the brief says "no core change" / "SCOPE OUT: Core". I left this item unticked and untouched rather than guess which instruction wins. Left as-is: `packages/graphviz/src/relation-map.ts` and its test, unmodified.

## Journal

- **bumblebee-lite**: Confirmed develop reset at "card 64 done"; `npm install` and `npm run build` green in `packages/core`, `packages/graphviz`, `packages/doc`.
- **bumblebee-lite**: Checklist item 1 (graphviz `{opt}`) blocked — see QUESTION comment above. `ODSRelationMapAttribute` has no `optional` field to draw from without touching core, which is out of this card's scope. Stopped there; did not touch `relation-map.ts`.
- **bumblebee-lite**: `packages/pages/src/lib/molecules/AttributeTable.svelte` — `identifies` now renders as `<Keyword text="identifies" />` followed by `<code><Ref .../></code>`, replacing the bespoke `<span class="identifies">` in the secondary colour; removed the now-unused `.identifies` style rule.
- **bumblebee-lite**: `AttributeTable.test.ts` — updated the "identifies" assertion to check for the `Keyword` (`.keyword` class, text "identifies") and the `Ref` inside a `<code>`, since `.identifies` no longer exists as a wrapper class.
- **bumblebee-lite**: `AttributeTable.harness.svelte` — appended Order's `pet_id` attribute (the one identifies the petstore model carries) to the Pet attribute list, so the story shows the identifies mark alongside the identity/optional/linked-type marks it already demonstrated.
- **bumblebee-lite**: `packages/pages/src/lib/flow/DiagramOptionsPanel.stories.svelte` created, mirroring `LegendPanel.stories.svelte`'s pattern: an "Expanded" story and a "Collapsed by the fit" story (`crowded: true`) against the existing `DiagramOptionsPanel.harness.svelte`, which already supported both states.
- **bumblebee-lite**: Reconciled the two design docs on the panels' frame — `organism-interactive-diagram.md` still described the rounded-frame retouch as a "future card" item; card 64 (`flow-diagram-panels.md`) gave the panels their own card but only settled the give-way order, not the frame. Updated `organism-interactive-diagram.md` to point at `flow-diagram-panels.md` for the panels' current location/behaviour and to state plainly that the frame retouch (losing the rounded `--radius` frame for a 1px `panel.border` rule, matching `DataTable`/`DiagramFigure`) is still open and is a future card's work, not this one's. Added a matching cross-reference note to `flow-diagram-panels.md`. No CSS change made — the checklist item asked for the docs to agree, not for the frame itself to be retouched, and actually restyling the panels would be a visual/interface change outside this lite card's scope.
- **bumblebee-lite**: Ran `packages/pages` `npm run build`, `npx vitest run --coverage` (100/100/100/100, 96 files / 695 tests), `npm run check` (0 errors), `npx playwright test e2e/storybook.spec.ts` (208 passed, including both new `Flow/DiagramOptionsPanel` stories).
- **bumblebee-lite**: `npx biome check` on every touched file: clean (one formatting fix applied to `AttributeTable.harness.svelte`'s array literal, then re-checked clean).
- **bumblebee-lite**: Re-ran `packages/graphviz` `npx vitest run` unmodified as a baseline check: still green (19 tests), confirming the untouched checklist item didn't regress anything.

## Gates

- `packages/graphviz`: `npm run build` green; `npx vitest run` green, 19 tests (unmodified — item 1 blocked, see QUESTION comment).
- `packages/pages`: `npm run build` green; `npx vitest run --coverage` 100% statements/branches/functions/lines, 96 files / 695 tests passed; `npm run check` 0 errors, 0 warnings; `npx playwright test e2e/storybook.spec.ts` 208 passed.
- `npx biome check` on every touched file: clean.
