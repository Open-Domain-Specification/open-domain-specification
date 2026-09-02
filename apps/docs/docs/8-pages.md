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

The options panel in the interactive view picks how edges attach and how they are drawn, and
on the context map the figure **style**. *Cards* draws contexts as cards inside shaded namespace
clusters; *Sketch* draws them as ellipses in the spirit of a hand-drawn context map, with one
solid organic outline round the whole map and dashed boundaries between subdomains computed as
a Voronoi tessellation of the node centres, plus a muted label per subdomain. A domain is the
union of its subdomains' cells: its border is drawn thicker and solid, and the domain name runs
along that border like a map boundary label. On the context map a node can be dragged out of
its cluster and the backdrop follows it. The backdrop is an SVG layer under the nodes that pans
and zooms with the viewport.

The other two maps are always drawn in their UML form, so the style control is absent there.
The **consumable map** is a component diagram: each aggregate or service is a «component» box
with the component icon, its provided consumables are lollipops on its left edge labelled with
the pattern they are offered under, the consumables it uses are sockets on its right edge
labelled with its own protection pattern, and each consumption is an assembly connector from
socket to lollipop named after the consumable. The **relation map** is a class diagram: three
compartments per class (stereotype and name, attributes with `{id}` markers, an empty
operations compartment), composition with a filled diamond and "1" at the whole for
`includes`, a navigable association for `references` and a dashed dependency for `uses`, with
the cardinality at the far end and the role at the midpoint. Arrows, labels, port badges and
colours carry over from the static images; every edge is animated so the direction reads. A
collapsible **legend** at the top left indexes only the abbreviations, line styles and node
marks the current diagram shows. Every choice is remembered per browser.

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
