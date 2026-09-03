---
column: done
labels: [frontend, infra]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-09-03T13:20:00.000Z
---
# Shared pages package: one renderer for extension, static site and viewer

Extract the extension's page renderer (`html.ts`, `element-pages.ts`, `render.ts`, `graphviz.ts`, `site.ts`) and its assets (`page.css`, `page.js`, `site.css`, codicons) into `@open-domain-specification/pages` (`packages/pages`). The extension consumes the package for its detail panel and the `ODS: Export Static Site` command; the browser viewer (boards/project-backlog/24-browser-viewer-replaces-ods-ui.md) is the third host. See decisions/12-one-renderer-three-hosts.md.

## Checklist

- [x] Scaffold `packages/pages` (package.json, tsconfig, tsup build with a separate `site` entry that may use node:fs, vitest)
- [x] Move renderer sources and tests; package exports `renderPage`, `resolvePage`, `pageRefs`, `dotToSvg`, `esc` and the render types
- [x] Move assets into the package and copy them into the extension's `media/` at build time
- [x] Extension imports the package; panel and export command unchanged in behaviour
- [x] Docs page for the pages package and the static export
- [x] Root build and all tests green

## Gates

- [x] clean-code-swept — three-reviewer sweep (SRP/KISS, DRY/dead, naming/coupling); one finding above 0.5 and four below fixed, none left as TODOs; pages 100 and extension 4 tests green, biome and depcheck clean (claude, 2026-09-02T16:50:00.000Z)
- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T16:00:00.000Z): Picked up the card after the static-site proof of concept in apps/ods-vscode/src/pages/site.ts:1-290 showed the renderer needs no host. Plan: new package with two entries, `index` (browser-safe) and `site` (node), assets shipped in the package and copied into the extension at build.
- **claude** (2026-09-02T16:20:00.000Z): Extraction complete. Package at packages/pages/package.json:1-70 with two entries, `index` (browser-safe, packages/pages/src/index.ts:1-8) and `site` (node, packages/pages/src/site.ts:1-290); assets in packages/pages/assets and codicons copied at build by packages/pages/scripts/codicons.mjs:1-15. Sources moved with history: html, element-pages, render, graphviz, site and both test files. Extension now imports the package in apps/ods-vscode/src/pages/panel.ts:1-8, apps/ods-vscode/src/extension.ts:1-6 and apps/ods-vscode/src/search.ts:3, and apps/ods-vscode/esbuild.mjs:20-28 copies the package assets into media/ (now gitignored). marked, wasm-graphviz, codicons and graphviz deps left the extension. Docs at apps/docs/docs/8-pages.md:1-60; README line at apps/ods-vscode/README.md:24. Root build and all seven packages' tests green (pages 100, extension 4). Not done: the clean-code sweep gate, and the viewer host mode in page.js belongs to card 24.
- **claude** (2026-09-02T16:50:00.000Z): Clean-code sweep. Findings and fixes: the static site no longer regex-rewrites markup owned by another module; `link` and `resolveRefLinks` now sit together in packages/pages/src/html.ts:70-95 with the pattern beside the builder, and packages/pages/src/site.ts:88-100 only supplies the href. The table of contents and diagram modal are shared fragments (`tocList`, `diagramModal`) in packages/pages/src/html.ts:97-112 used by both the panel at apps/ods-vscode/src/pages/panel.ts:170-176 and the site shell, which also fixes the panel's unescaped section labels. Dropped the unused `assetsDir` override and the leftover `mediaDir` name in packages/pages/src/site.ts:236-246. Codicons moved to devDependencies in packages/pages/package.json:60-65 since it is only used at build. Generated example site removed from packages/ods-example-ws.
