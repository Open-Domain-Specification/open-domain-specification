---
column: todo
labels: [infra, docs, frontend]
priority: med
agent: dev-opus
updatedAt: 2026-09-03T15:00:00.000Z
---
# Playwright spec: a generated docsify site renders every page in a browser

No browser test ever opens a docsify site. Serve the petstore `docs/` folder from the pages Playwright config (a second static `webServer` entry, like the export one) and walk the sidebar, asserting each page renders a heading and the run reports no console errors or failed requests. Docsify loads from a CDN, so the spec needs network like the docs build does.

Open question to settle first: `toDoc` emits no `index.html` (56 files for petstore, all markdown and svg), so check what `docsify serve ./docs` actually serves today and, if the site depends on docsify-cli's built-in shell, have the generator emit an `index.html` so the folder is a complete static site on any host.

## Checklist

- [ ] Decide and, if needed, emit `docs/index.html` from the generator (and a test for it)
- [ ] `packages/pages/e2e/docsify.spec.ts` with its own static server entry serving `models/petstore/docs`
- [ ] Walk every sidebar link; assert a rendered `h1`, no console errors, no failed requests
- [ ] Wired into `npm run test:e2e`; docs page for the doc package mentions the check

## Comments

- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-opus. Decision on the open question: `docsify serve` only works today because docsify-cli injects its own shell; the generator MUST emit `docs/index.html` so the folder is a complete static site. Emit it from packages/doc `toDoc` as a plain docsify shell (CDN `//cdn.jsdelivr.net/npm/docsify@4` script + theme css, `loadSidebar: true`, `name` set to the workspace name, `subMaxLevel: 2`); add a unit test that the key exists and contains the sidebar setting. This raises the petstore file count to 57; card 38 snapshots 56 in parallel and the lead reconciles at merge, do not touch card 38. Playwright: add `packages/pages/e2e/docsify.spec.ts` and a third webServer entry `node e2e/static-server.mjs 4175 ../../models/petstore/docs` (check static-server.mjs serves index.html for `/`; extend it if not). The spec collects sidebar hrefs after first render, visits each, asserts a visible h1, and fails on any console error or failed request. Skip the spec cleanly (test.skip with a message) if `models/petstore/docs` is absent rather than building it from the pages package. Docs page: the doc package page under docs/ gains a sentence on the browser check. Work in your worktree; `npm ci` there first if node_modules is missing, and run `npm run build -w models/petstore` before the spec.
