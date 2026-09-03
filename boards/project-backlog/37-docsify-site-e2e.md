---
column: todo
labels: [infra, docs, frontend]
priority: med
updatedAt: 2026-09-03T13:40:00.000Z
---
# Playwright spec: a generated docsify site renders every page in a browser

No browser test ever opens a docsify site. Serve the petstore `docs/` folder from the pages Playwright config (a second static `webServer` entry, like the export one) and walk the sidebar, asserting each page renders a heading and the run reports no console errors or failed requests. Docsify loads from a CDN, so the spec needs network like the docs build does.

Open question to settle first: `toDoc` emits no `index.html` (56 files for petstore, all markdown and svg), so check what `docsify serve ./docs` actually serves today and, if the site depends on docsify-cli's built-in shell, have the generator emit an `index.html` so the folder is a complete static site on any host.

## Checklist

- [ ] Decide and, if needed, emit `docs/index.html` from the generator (and a test for it)
- [ ] `packages/pages/e2e/docsify.spec.ts` with its own static server entry serving `models/petstore/docs`
- [ ] Walk every sidebar link; assert a rendered `h1`, no console errors, no failed requests
- [ ] Wired into `npm run test:e2e`; docs page for the doc package mentions the check
