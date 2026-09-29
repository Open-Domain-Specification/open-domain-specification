---
column: doing
labels: [accessibility]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-29T16:55:00.000Z
---
# The reader knows where they are

Issue #50, a child of epic #61. The tree marked the page being read with a background wash and nothing else, so a screen-reader reader could not tell which row was the current page, and the tree and the table of contents were not distinguishable landmarks (the contents was an `aside`). The tree row for the page being read now carries `aria-current`, decided in one place with the wash so the two cannot disagree, and the tree, the page and the contents are each a landmark, the two navigations told apart by name. The tree is drawn in the viewer and the static export; the VS Code webview has the page and the contents and no tree, because the extension's own tree view is its navigation.

## Checklist

- [x] A Playwright test that fails on the old renderer, with real keys and history: `Enter` on tree links, `page.goBack()`, `page.goForward()`, asserting `aria-current`, the drawn wash and the landmark roles and names (`packages/pages/e2e/current-page-landmarks.spec.ts`, all 7 failing before the change)
- [x] Exactly one tree link carries `aria-current="page"`, the row for the page being read, and it moves on every navigation, including history
- [x] The accessible state is the visual state: the rows drawn `.item.active` are exactly the links carrying `aria-current`
- [x] Tree, page and contents are landmarks: `nav` "Workspace elements", `main`, `nav` "On this page"; the contents is no longer an `aside`
- [x] A contents entry leaves the current mark where it is
- [x] Hosts: the viewer and the static export (opened from disk); the embedded bundle under a simulated VS Code API for the landmarks it has
- [x] Pages stays at its 100% coverage threshold; `npm run check` reports 0 errors and 0 warnings

## Gates

- [x] biome check on the touched files
- [ ] `bash scripts/verify-all.sh`
- [ ] real VS Code host check (lead)

## Comments

- **developer** (2026-09-29T16:49:00.000Z): Mechanism. `packages/pages/src/lib/organisms/Sidebar.svelte:54-70` is the single decision: `here` is the deepest tree row the current ref is at or under, and `state(ref)` is `page` for it, `true` for the rows above it and undefined for the rest; `:77-78` uses that for both the `.active` wash and the link's `aria-current`. `packages/pages/src/lib/atoms/Lockup.svelte:29` and `packages/pages/src/lib/atoms/Ref.svelte:28,39` carry the value to the anchor, which is where `aria-current` belongs. Landmarks: `Sidebar.svelte:86` `nav` "Workspace elements", `packages/pages/src/lib/organisms/Toc.svelte:26` `nav` "On this page" (its visible title is `aria-hidden`, so the name is not read twice), and the `main` in `packages/pages/src/lib/templates/PageLayout.svelte:20`, which is the only one in the app once a workspace is open and so needs no name. `aside.toc` in `packages/pages/e2e/browse.spec.ts` and `relationship.spec.ts` became `nav.toc`.
- **developer** (2026-09-29T16:49:00.000Z): Decisions. (1) The wash already marked a page's row and its ancestors, and a card pinned that, so the design is unchanged and the ancestors get `aria-current="true"`; only the row for the page has `page`, so "exactly one current page" holds and the accessible state equals the drawn state. If the owner would rather the ancestors carry nothing, the wash should then be narrowed to the one row, and that is a design change. (2) The brand line, which links to the workspace page, is not marked current on the workspace page: it draws no wash there today, and marking it for assistive technology alone would put the two out of step. Recommend the designer decide whether the brand should wear the wash on the workspace page; the accessible mark then follows. (3) A page with no tree row (the workspace, the health report) marks nothing. (4) Labels avoid the word "navigation", which the role already announces.
- **developer** (2026-09-29T16:55:00.000Z): Design record: `docs/design/design-language-v2.md` now states `Ref` and `Lockup` `current`, the tree and contents landmarks and the single `main`, and `Sidebar`'s `aria-current` rule (entries in the primitive and organism tables).
