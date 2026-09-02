---
column: backlog
labels: [frontend, breaking, docs]
priority: high
updatedAt: 2026-09-02T17:15:00.000Z
---
# Svelte app: viewer, static export and webview from one bundle; ods-ui deleted

Port the page renderer in `@open-domain-specification/pages` to a client-only Svelte app built with Vite. The component library is organised by atomic design and documented in Storybook. The app takes a workspace and diagnostics as input, renders every element page with hash routing and the sidebar navigation, and runs Graphviz through the wasm build in the browser. It ships with three entries: a viewer with an import screen (URL query parameter, URL form, file upload, remembered last URL), the static export (bundle plus workspace JSON plus `index.html`, run from `ODS: Export Static Site`), and the extension webview, which mounts the bundle and passes the workspace over `postMessage`. Then delete `apps/ods-ui`, its docs section, its deploy wiring and its dependencies. Depends on boards/project-backlog/23-shared-pages-package.md. See decisions/12-one-renderer-three-hosts.md, including its amendment.

## Checklist

- [ ] Vite plus Svelte build in `packages/pages`; component library organised by atomic design (atoms, molecules, organisms, page templates) mirroring the element pages and the theme in `page.css`
- [ ] Storybook for the library with a story per component fed by the petstore example, wired into the package scripts
- [ ] Hash router, sidebar navigation, table of contents, diagram lightbox and ref links as components
- [ ] Graphviz wasm and core validate running in the browser; diagnostics also accepted as input
- [ ] Viewer entry with the import screen ported from ods-ui
- [ ] Static export writes the bundle, the workspace JSON and `index.html`; the per-page generator and string renderer are removed
- [ ] Extension webview mounts the bundle; panel shell, `page.js` and the message bridge move into the app
- [ ] Component tests with vitest and jsdom, including the every-ref coverage test on the petstore example
- [ ] Delete `apps/ods-ui`, docs section 6-ods-ui, deploy workflow and README links; docs page for the app
- [ ] Root build and all tests green
