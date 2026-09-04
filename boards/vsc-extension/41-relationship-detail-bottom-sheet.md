---
column: todo
labels: [frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-05T16:00:00.000Z
---
# Relationship detail opens in a bottom sheet, not a nested table row

Expanding a row of the Strategic position table renders `RelationshipDetail` inside a `colspan` cell, and that detail carries its own tables (the crossings table above all). A table inside a table row reads awkwardly: two header rows, two column rhythms and two hover treatments in one grid. Move that disclosure into a bottom sheet.

The health report's expanded row stays as it is: its detail is a comment list, not a table, and reads correctly inline.

## Checklist

- [ ] A bottom sheet primitive (`atoms/BottomSheet.svelte` or `molecules/`, your call) modelled on the VS Code panel: a header row carrying the title and a close button, a body that scrolls, docked to the bottom of the page area, Escape closes it, focus returns to the row's toggle, one open at a time
- [ ] `organisms/StrategicPositionTable.svelte` opens the sheet with `RelationshipDetail` instead of passing `detail` to `DataTable`; the row toggle becomes the sheet's trigger and carries the right `aria-expanded`/`aria-controls`
- [ ] `DataTable`'s `detail` prop stays for the health report; if nothing else uses it after this card, say so in the journal rather than deleting it
- [ ] Stories for the sheet in light, dark and high contrast, and a Strategic position story with the sheet open; render spec green
- [ ] e2e on the petstore Sales page: open a row's detail, read the relationship title and a comment inside the sheet, press Escape and see it close with focus back on the toggle
- [ ] Pages unit at 100%; the whole Playwright suite green; `docs/design/design-language-v2.md` gains the sheet as a primitive with the reason it exists

## Comments

- **lead** (2026-09-05T16:00:00.000Z): Assigned to dev-opus. Load the `frontend-design` skill and make the visual calls yourself, journalling each with its reason; the design language in `docs/design/design-language-v2.md` governs, and its principle 8 puts small disclosure in the editor's hover, so this sheet is the shape for disclosure too big for a hover. VS Code's own bottom panel (Problems, Output, Terminal) is the reference: same header treatment, same border, theme tokens only, no rounded card, no scrim over the page. Decide and journal: whether the sheet is fixed to the viewport bottom or docked inside the page column, how tall it is by default, and whether it is resizable. The relationship's own page stays reachable and unchanged; the sheet is the in-page reading. Do not touch the health report, the hover card, or the map disclosure card. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
