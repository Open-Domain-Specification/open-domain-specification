# Pages

`@open-domain-specification/pages` is the one UI for ODS workspaces: a client-only Svelte app
and the component library it is built from. Every host renders through it, so the viewer, the
static site export and the VS Code detail panel look the same and change together. See
decision 12 in the repository for the reasoning.

## The app

The app takes a workspace, its diagnostics and a file label, and renders one page per element
with hash routing. A ref is already a hash, so a link to an element is just its ref, and a
leaf ref such as an entity opens its aggregate's page and scrolls to the entity.

Three hosts feed it:

- **Viewer**: an import screen (URL query, URL form or file upload) in front of the app.
- **Static export**: the built bundle beside `index.html` with the workspaces inlined, written
  by `exportSite` from the `site` entry and by the VS Code command `ODS: Export Static Site`.
  The output runs from a folder, a `file://` URL or any static host.
- **VS Code webview**: the extension mounts the bundle, sends the workspace and diagnostics
  over `postMessage`, and follows the app's navigation in its tree view. The tree replaces the
  sidebar there.

Diagrams come from the bundled Graphviz wasm build, rendered in the browser. Every figure has
an **interactive** toggle that swaps the static image for a Svelte Flow graph: pan, zoom, drag
nodes, and click one to open its page. The graph is laid out with dagre from the same core map
the static image is drawn from, so the two never disagree.

## Component library

The library follows atomic design under `src/lib`: atoms (icon, chip, ref link, markdown),
molecules (cards, tables, fact rows), organisms (section, page header, diagram figure with
lightbox, sidebar, table of contents) and one template per element page. Run Storybook to
browse it against the petstore example:

```bash
cd packages/pages
npm run storybook
```

`page.css` styles everything and reads the VS Code theme variables; `site.css` defines those
variables for light and dark outside the editor.

## Tests

Two suites run separately. `npm run test:unit` runs vitest under jsdom with coverage enforced
at 100 percent over the library, the app shell and the package entries. `npm run test:e2e`
builds the package and runs Playwright against the real bundle: the viewer's import paths, browsing
and navigation, a static export served from a folder, the embedded webview protocol with a
simulated VS Code bridge, and the diagram lightbox and interactive toggle.

## Static site from code

```ts
import { exportSite } from "@open-domain-specification/pages/site";

await exportSite({
	sources: [{ workspace, fileLabel: "petstore.json", diagnostics: workspace.validate() }],
	outDir: "ods-site",
});
```
