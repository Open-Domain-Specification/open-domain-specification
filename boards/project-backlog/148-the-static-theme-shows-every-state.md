---
column: doing
labels: [bug, frontend]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-29T16:32:00.000Z
---
# The static theme shows every state

Issue #52, a child of epic #61 (accessible navigation across the viewer, export and extension). Some interaction tokens existed only in the VS Code theme, so in the static export and the viewer a focus ring, a row hover and the active tree row fell back to nothing: `outline: 1px solid var(--vscode-focusBorder)` computed to `outline-style: none` because `assets/site.css` never defined `--vscode-focusBorder`. The static theme now defines every `--vscode-*` token a component or `page.css` reads, in a light and a dark block, and a unit test fails when a component reads a token the theme lacks, so the check outlives this card.

## Checklist

- [x] Inventory: every `var(--vscode-*)` read by `src/**` (Svelte styles, TS, the run-time symbol icon token) and `assets/page.css`, against what `assets/site.css` declares
- [x] Guard test first, failing today with 21 tokens: `packages/pages/src/lib/static-theme.test.ts:72-77` (light) and `:79-84` (dark), plus a dark-only-override check at `:86-88`
- [x] Tokens added to both blocks of `assets/site.css` (`:30-49` light, `:71-90` dark), values from the Light Modern and Dark Modern defaults the Storybook `Theme.harness.svelte` already pins
- [x] Real-input e2e on the viewer and the static export, light and dark: Tab to a tree link and a table button and assert a drawn focus ring, hover a tree row and a table row and assert the wash, assert the active tree row is a filled row: `packages/pages/e2e/interaction-states.spec.ts:24-42` (ring), `:61-112` (states), `:114-139` (four runs)
- [x] Failing first: the e2e failed on the old `site.css` with `outlineStyle: "none"` on both surfaces and both schemes; green after
- [x] Pages unit suite at 100% coverage and `npm run check` clean

## Gates

- [x] biome check on the touched files
- [ ] `bash scripts/verify-all.sh`
- [ ] real VS Code host check (lead)

## Journal

- 2026-09-29T16:20:00.000Z (approximate, before the first commit) Read `assets/site.css`, which declares 22 tokens, and collected what the source reads with a whole-file regex, because several `var(` calls break the line before the token (`Sidebar.svelte:120-124`, `:127-131`). One token is composed at run time: `kinds.ts:32` builds `--vscode-symbolIcon-${token}` for ten kinds, so the guard calls `iconColor` for every kind rather than scanning for a template.
- 2026-09-29T16:22:00.000Z (approximate) `static-theme.test.ts` failed with 21 missing tokens: `focusBorder` (read in `DataTable.svelte:241`, `Ref.svelte:49`, `Toc.svelte:63`, `Modal.svelte:240` and others), `list-hoverBackground` (`DataTable.svelte:259`, `Sidebar.svelte:116`), `list-activeSelectionBackground` and `-Foreground` (`Sidebar.svelte:120-131`), `textLink-activeForeground` (`Ref.svelte`), `editorHoverWidget-*` and `widget-shadow` (`HoverCard.svelte`), `contrastBorder` (`Heading.svelte`), `contrastActiveBorder` (`DataTable.svelte`) and ten `symbolIcon-*Foreground` tokens (`kinds.ts:32`).
- 2026-09-29T16:25:00.000Z (approximate) Values: focusBorder `#005fb8` light and `#0078d4` dark; list hover `#f2f2f2` and `#2a2d2e`; active selection `#0060c0` on white text and `#04395e` on white text; link active equals the link colour; hover widget, widget shadow and contrast borders as `Theme.harness.svelte:45-113`; the symbol icons follow VS Code's `symbolIcons.ts` defaults (class and event orange, field blue, function and method purple, struct, constant, module, namespace and package the plain foreground). The dark block repeats every token the light block defines, apart from the three font tokens no theme changes, which the guard enforces.
- 2026-09-29T16:28:21.000Z Committed 9e8491c. The e2e was run against a throwaway Playwright config on port 4192 only (viewer through `vite preview`, export through `e2e/static-server.mjs`), deleted afterwards. With the old `site.css` built in, both surfaces failed at the first focus assertion: `{"outlineStyle":"none","outlineWidth":3,"outlineColor":"rgb(0, 95, 184)","boxShadow":"none","focusVisible":true}`. With the fix: 4 of 4 green (viewer and export, light and dark).
- 2026-09-29T16:31:16.000Z `npx vitest run --coverage` in `packages/pages`: 101 files, 910 tests, 100% across all columns. `npm run check`: 0 errors, 0 warnings.
- 2026-09-29T16:32:00.000Z Not asserted, on purpose: high contrast. The static theme has no high-contrast variant and never sets `.vscode-high-contrast`, so the dashed `contrastActiveBorder` hover is an extension-only state; the lead's real host check covers it.
- 2026-09-29T17:23:44.000Z Real VS Code host, verified with `apps/ods-vscode/e2e-keyboard/journeys.spec.ts` (`npm run test:vscode:keyboard`, real VS Code 1.96.4 driven by Playwright-Electron: real key and pointer events at the workbench, the webview's DOM only read; one launch per describe): with the real theme, the focused link after a real Tab has `:focus-visible` and a drawn outline or shadow, `--vscode-focusBorder` is supplied by the host, and moving the real pointer over a strategic-position table row changes its background to a non-transparent wash. High contrast was not run (the real host ran its default theme).
