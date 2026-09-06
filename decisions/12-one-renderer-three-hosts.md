---
status: Accepted
date: 2026-09-02
---
# Decision 12 — One page renderer, three hosts; ods-ui is retired

## Current position (2026-09-10)

The amendment of 2026-09-02 is the current design: the renderer is a client-only Svelte app built with Vite in `@open-domain-specification/pages`, hash-routed, rendering Graphviz in the browser, with an atomic-design component library exercised in Storybook. The decision bullets that the package holds HTML string builders and that the static site writes one HTML file per element no longer hold; see the amendment of 2026-09-02. What the amendment kept: three hosts (extension webview over `postMessage`, static export as the bundle beside the workspace JSON, browser viewer with an import screen), pages read-only with mutations in a host-owned drawer, and the intent that `apps/ods-ui` is deleted once the viewer covers import and browsing, with no compatibility period. The record does not say whether that deletion has happened.

The consequence that cross-file refs resolve within one workspace file still describes the limit, since decision 08's set loader is unimplemented (decision 08, amendment of 2026-09-07). Search exists only in the extension per the consequences; no later note in this record moves it.

Four ways of reading a model are supported and all four are permanent: the VS Code extension's webview, the static site export, the `apps/ods-ui` browsing site, and the markdown `@open-domain-specification/doc` generates (correction of 2026-09-10). `apps/ods-ui` is already the viewer on the shared renderer, depending on `@open-domain-specification/pages` and nothing else; the React and Mantine application the decision bullet retired is gone.

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

## Note (2026-09-10)

`apps/ods-ui` is still in the tree. The owner has said the extension is the user interface and the web application is likely to go; it goes when the extension covers import and browsing, and this record will say so when it does.

## Correction (2026-09-10)

The title and the decision bullet read as though the browsing site goes away. They never meant that, and the owner has said so: the project supports four ways of reading a model and all four are permanent. The VS Code extension renders pages in its webview. The static site export writes a folder anyone can host. `apps/ods-ui` is the browsing site, where a reader imports a workspace by URL, form or file and browses it. And `@open-domain-specification/doc` generates markdown, which is how a model reaches a repository, a wiki or a pull request.

What "ods-ui is deleted" meant was the React and Mantine application: it was replaced by the viewer built on the shared Svelte renderer, and that replacement has happened. `apps/ods-ui` depends on `@open-domain-specification/pages` and nothing else; it is the viewer. The pattern stands and there is nothing outstanding.
