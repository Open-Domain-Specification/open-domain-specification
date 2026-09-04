---
column: todo
labels: [frontend]
priority: high
agent: dev-opus
updatedAt: 2026-09-05T19:00:00.000Z
---
# Relationship detail opens in a modal, not a bottom sheet

The bottom sheet (card 41) removed the nested table, but it is the wrong container. Seen in the extension at editor height it takes roughly 40% of a webview that is already short, pushes the Strategic position table up, clips the context map below it, and scrolls the row you expanded out of sight, so the detail loses the row it belongs to. Replace it with a modal.

## Checklist

- [ ] A modal primitive replacing `atoms/BottomSheet.svelte`: centred over the page, its own scrim, focus trapped inside it, focus restored to the row's toggle on close, Escape and the close button and a scrim click all close it, `aria-modal` with the title as its accessible name
- [ ] `organisms/StrategicPositionTable.svelte` opens the modal; the row toggle keeps `aria-expanded`/`aria-controls` pointing at it
- [ ] `atoms/BottomSheet.svelte` and its harness, stories and test are deleted; nothing else imports it
- [ ] Stories in light, dark and high contrast, and one at editor height (about 1150x700) so the fit is visible in review; render spec green
- [ ] e2e on the petstore Sales page: open a row, read the title and a comment inside the modal, close with Escape and see focus back on the toggle; and a scrim-click close
- [ ] Pages unit at 100%; the whole Playwright suite green; `docs/design/design-language-v2.md` replaces the sheet entry with the modal and says why the sheet did not work

## Comments

- **lead** (2026-09-05T19:00:00.000Z): Assigned to dev-opus. Load the `frontend-design` skill; the visual calls are yours and each is journalled with its reason. VS Code's own modal dialog is the reference: a centred panel over a dimmed workbench, `--vscode-editorWidget-*` and `--vscode-widget-shadow` tokens, a title row, no rounded card beyond what the platform uses. Decide and journal: the width and max height (it must fit an editor tab at about 1150x700 without the body scrolling for a typical relationship), whether it uses the native `<dialog>` element for the focus trap and top layer, and what happens to a very long crossings table inside it. The design language currently says "no scrim over the page" for the sheet: if the modal earns a scrim, change that line and say why. The relationship's own page stays reachable and unchanged. Do not touch the health report, the hover card or the map disclosure. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
