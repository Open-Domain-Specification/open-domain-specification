---
status: Accepted
date: 2026-09-02
---
# Decision 12 — One page renderer, three hosts; ods-ui is retired

## Context

The project carried two UIs for the same model. `apps/ods-ui` is a React and Mantine single
page app that imports a workspace from a URL or file upload and browses it. The VS Code
extension renders detail pages in a webview from plain HTML string builders. Both had to be
kept in step with every change to the core model, and the extension's pages were already the
richer of the two (relation maps, consumables, diagnostics, glossary).

The extension's renderer has no VS Code dependency outside the webview shell: it takes a
workspace and a ref and returns a title, body HTML and section list. A proof of concept showed
the same code can emit a static site with only a theme stylesheet and a sidebar shell added.

## Decision

- A single page renderer lives in a shared package, `@open-domain-specification/pages`
  (`packages/pages`). It holds the HTML builders, the element pages, the Graphviz-to-SVG
  helper, the static site generator, and the page assets (`page.css`, `page.js`, `site.css`
  and the codicons it needs).
- Three hosts consume it and nothing else renders pages:
  - the VS Code detail panel, which adds a toolbar, editor navigation and, later, an editing
    drawer;
  - the static site export, run from the extension (`ODS: Export Static Site`), which writes
    one HTML file per element with a navigation sidebar;
  - a browser viewer that replaces `ods-ui`: import by URL query, URL form or file upload,
    then browse client-side using the same renderer.
- The pages are read-only in every host. Mutations, when they arrive, live in a host-owned
  drawer beside the page, never inside the rendered body.
- `page.js` is host-neutral: it posts messages when a VS Code API is present, routes through
  the hash in the viewer, and falls back to plain hrefs in the static site.
- `apps/ods-ui` is deleted once the viewer covers import and browsing. No feature toggle; the
  switch is at the app level and there is no compatibility period, per the project's
  no-backwards-compatibility stance.

## Amendment (2026-09-02)

The renderer moves from HTML string builders to a client-only Svelte app built with Vite.
No server-side rendering and no SvelteKit: the app takes a workspace as input and renders
everything in the browser, Graphviz included. This collapses the hosts:

- The static site export copies the built bundle beside the workspace JSON and an
  `index.html`, instead of writing one HTML file per element.
- The browser viewer is the same bundle with an import screen in front.
- The extension webview mounts the same bundle and passes the workspace and its diagnostics
  over `postMessage`. The editing drawer is a set of components in the same app, so page and
  drawer share data and styling.

Routing is hash-based so the bundle works from a folder or a `file://` URL. The
`@open-domain-specification/pages` package becomes the Svelte component library and app; the
string renderer, its tests and the per-page site generator are ported and removed. The
extension keeps esbuild for its host code and adds a Vite build for the webview bundle.

The component library follows atomic design: atoms (chips, icons, links, badges), molecules
(cards, tables, fact rows), organisms (page sections, sidebar, diagram figure) and the element
page templates. Storybook documents and exercises the library in isolation, with a story per
component fed by the petstore example, so the pages can be reviewed and iterated without a
host.

Trade-offs accepted: pages need JavaScript, so nothing is crawlable or readable with scripts
off; first paint waits for the bundle and the wasm. Component tests with vitest and jsdom
replace the string assertions.

## Consequences

- One place to change when the model changes; the hosts differ only in how the workspace
  reaches the app and which entry screen sits in front.
- Mantine, React Router, d3-graphviz and shiki leave the dependency tree with `ods-ui`.
- The docs section for `ods-ui` is replaced by pages on the viewer and the static export.
- Search exists only in the extension for now. The viewer and static site need a client-side
  index before they match it.
- Cross-file refs resolve within one workspace file, matching the panel's current limit.
