---
column: review
labels: [frontend, infra]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-09-03T13:05:00.000Z
---
# Unit and end-to-end tests for the pages app, 100% coverage

Two suites in `packages/pages` that run separately: `test:unit` (vitest, jsdom, coverage enforced at 100% lines, branches, functions and statements over `src/lib`, `src/app` and the library entries) and `test:e2e` (Playwright against the built app). The e2e suite walks every UI path: the viewer's import screen by URL query, URL form and file upload; browsing and hash navigation; the static export served from a folder; the embedded webview path with a simulated VS Code bridge and its message protocol; the diagram lightbox and the interactive Svelte Flow toggle with node-click navigation. Follows boards/project-backlog/24-browser-viewer-replaces-ods-ui.md and 25.

## Checklist

- [x] Vitest split into `unit` with v8 coverage and 100% thresholds; Playwright config with `e2e/` and its own web servers
- [x] Unit tests to 100% for atoms, molecules, organisms, templates, app shell, router, model, resolve, flow adapters and layout, site export, graphviz helper
- [x] E2E: viewer import by `?url=`, by form, by file; error path
- [x] E2E: browse, sidebar, table of contents, leaf-ref scroll, back/forward
- [x] E2E: static export served from a folder, single and multi-workspace
- [x] E2E: embedded mode with a fake `acquireVsCodeApi`: ready, model, navigate, navigated, toolbar reveal
- [x] E2E: diagram lightbox and interactive toggle, node click navigates
- [x] Root `npm test` runs unit; e2e wired as `npm run test:e2e`; docs and copilot notes updated

## Gates

- [x] clean-code-swept — reviewer sweep of the test code (DRY, dead code, naming); both findings fixed: shared xyflow polyfill helper, redundant dynamic imports removed; 241 unit tests at 100/100/100/100, 24 e2e green (claude, 2026-09-02T23:20:00.000Z)
- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T21:00:00.000Z): Picked up the card. Plan: vitest projects for unit with coverage thresholds at 100, Playwright for e2e with a preview server for the viewer and a static server for an export made in a global setup; fill unit gaps by area.
- **claude** (2026-09-02T22:40:00.000Z): Harness: packages/pages/vitest.config.ts:1-35 is the unit suite with v8 coverage and 100% thresholds (types-only protocol.ts and the mount-only main.ts excluded); packages/pages/playwright.config.ts:1-25 runs e2e against `vite preview` and a static export that packages/pages/e2e/global-setup.ts:1-30 builds with two workspaces, served by packages/pages/e2e/static-server.mjs:1-25. Unit tests were written by two subagents by area and reach 100 in all four columns with 227 tests; three compiler-generated fallback branches were made coverable at the source (packages/pages/src/lib/flow/OdsNode.svelte:7-21, packages/pages/src/lib/organisms/InteractiveDiagram.svelte:22-27, packages/pages/src/lib/templates/ContextPage.svelte:68-72). E2E: five specs, 24 tests, one per UI path (packages/pages/e2e/viewer-import.spec.ts, browse.spec.ts, export.spec.ts, embedded.spec.ts, diagrams.spec.ts). The e2e suite found a real bug: the multi-workspace picker dropped deep links; fixed in packages/pages/src/app/WorkspacePicker.svelte:7-9 with a unit case and the e2e test enabled. Docs at apps/docs/docs/8-pages.md:44-50 and .github/copilot-instructions.md:109-112. A reviewer is sweeping the test code for duplication before review.
- **claude** (2026-09-02T23:20:00.000Z): Sweep done. Polyfills for Svelte Flow now live once in packages/pages/src/lib/xyflow-test-env.ts:1-30 and the two diagram suites call it; the redundant dynamic imports in packages/pages/src/app/WorkspacePicker.test.ts and packages/pages/src/lib/organisms/InteractiveDiagram.test.ts are gone. The three reference organisations from card 27 are in the fixtures (packages/pages/src/lib/fixtures.ts) and packages/pages/src/lib/Page.test.ts:30-50 renders every page of all four workspaces. Root test run: 426 unit tests across seven packages; e2e 24.
