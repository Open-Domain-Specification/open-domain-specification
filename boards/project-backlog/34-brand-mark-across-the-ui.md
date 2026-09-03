---
column: done
labels: [frontend, design]
priority: medium
agent: claude
live: false
status: Done; logo and favicon set across the viewer, export, extension and README
progress: 100
updatedAt: 2026-09-03T12:10:00.000Z
---
# The new ODS mark across the UI

A new logo (media/logo.svg, media/logo.png) and favicon set (media/favicon) replace the placeholder branding. Put the mark everywhere a visitor meets the product: the viewer's import screen and workspace picker, the sidebar of every page (viewer and static export), the browser tab, the VS Code extension's marketplace icon and panel tab, and the README.

## Checklist

- [x] `Logo` atom inlines the SVG so it renders in the viewer, the export and the webview without an asset URL
- [x] Import screen, workspace picker and sidebar show the mark
- [x] SVG favicon in the pages bundle and copied by the static export
- [x] Full favicon set and web manifest at the open-ds.io root, head links per media/favicon.md
- [x] Extension: marketplace icon and colour panel-tab icon
- [x] README header and docs site logo and favicon

## Comments

- **claude** (2026-09-03T12:10:00.000Z): packages/pages/src/lib/atoms/Logo.svelte carries the three paths from media/logo.svg, decorative (`aria-hidden`) so heading names stay as they were. Used in ImportScreen, WorkspacePicker and Sidebar. packages/pages/public/favicon.svg ships in the bundle and packages/pages/src/site.ts copies it beside the export; apps/ods-ui/scripts/build.mjs copies media/favicon to the site root and swaps the single link for the full set. apps/ods-vscode uses media/icon.png for the marketplace and the panel tab, media/activity.svg (mono) for the activity bar. Verified in headless Chromium over the built open-ds.io folder: import screen and workspace page render the mark, favicon requests all 200. 359 unit tests at 100% coverage, 35 e2e, root build and test green.
