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

Every figure is a Svelte Flow graph rendered in the browser: pan, zoom, drag nodes, and click
one to open its page. The graph is laid out with dagre from the core map for that element. The
`@open-domain-specification/graphviz` package still renders the same maps as DOT for use
outside the pages.

The options panel on each figure picks how edges attach and how they are drawn, and
on the context map the figure **style**. *Cards* draws contexts as cards inside shaded namespace
clusters; *Sketch*, the default, draws them as ellipses in the spirit of a hand-drawn context map, with one
solid organic outline round the whole map and dashed boundaries between subdomains computed as
a Voronoi tessellation of the node centres, plus a muted label per subdomain. A domain is the
union of its subdomains' cells: its border is drawn thicker and solid, and the domain name runs
along that border like a map boundary label. On the context map a node can be dragged out of
its cluster: the backdrop follows it, and in the cards style the cluster boxes refit round
their members as it moves. The backdrop is an SVG layer under the nodes that pans
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
colours follow the page theme; every edge is animated so the direction reads. A
collapsible **legend** at the top left indexes only the abbreviations, line styles and node
marks the current diagram shows. Every choice is remembered per browser.

## Reading a relationship

A bounded context page lists its **Strategic position**: who it depends on, who depends on it,
and who it merely works alongside, grouped under those three headings. The Description column
prints what the author wrote on the relationship. Where nobody wrote anything, it prints a
generated sentence instead — for example *"Sales BC depends on Catalog BC as a customer,
consuming its Open Host Service, and it protects its model with an Anti-Corruption Layer."*
The sentence is `relationshipNarrative` in core, read from the context whose page you are on,
so the same relationship reads one way from each end. It is also the hover text of the
counterpart on every row, described or not, and the doc generator prints it in italics in the
same column.

A row whose relationship has anything recorded against it — a disposition other than the
default, or a comment — carries a chevron. Expanding it opens the same block the
relationship's own page renders, in place, without navigating away: the roles, the comments
with their links, and the consumables that cross the boundary. The type and the role codes
beside it (`OHS`, `PL`, `CF`, `ACL`) are keywords, set in the editor font because they are
codes from a table, and each carries the pattern's one-line meaning as its hover text.

A relationship's own page renders that same block at page level, so what a row discloses in
place and what the page shows are one component. Every pattern keyword there carries the
pattern's one-line meaning as its hover text, as it does in the table.

## Component library

The library follows atomic design under `src/lib`, built to the design language in
`docs/design/design-language-v2.md`: rows, tables and keywords in the workbench's own idiom
rather than cards, chips and pills.

- **atoms** — heading, keyword, lockup, ref, definition list, data table, disposition, empty
  state, comments, hover card, markdown, icon, logo.
- **molecules** — crumbs, problems, the provides, consumes, attribute and subdomain tables,
  the context and team lockups, the structure and consumable subsections.
- **organisms** — section, page header, table of contents, sidebar, attributes, invariants and
  language sections, health report, strategic position table, relationship detail, diagram
  figure and the interactive diagram.
- **templates** — `PageLayout`, the two columns and the table of contents every page is drawn
  in, and one template per element page.

Every page renders through `Page.svelte`, which picks the template for a ref and puts it in
`PageLayout`. Each component carries its own styles, so a page draws correctly wherever it is
mounted.

Run Storybook to browse it against the petstore example:

```bash
cd packages/pages
npm run storybook
```

`page.css` supplies the theme tokens, the document defaults and the few things no single
component owns — the toolbar, the anchor flash, the import screen — and reads the VS Code
theme variables; `site.css` defines those variables for light and dark outside the editor and
styles the column the site's tree sits in.

## Tests

Two suites run separately. `npm run test:unit` runs vitest under jsdom with coverage enforced
at 100 percent over the library, the app shell and the package entries. `npm run test:e2e`
builds the package and runs Playwright against the real bundle: the viewer's import paths, browsing
and navigation, a static export served from a folder, the embedded webview protocol with a
simulated VS Code bridge, and the interactive diagrams.

## Static site from code

```ts
import { exportSite } from "@open-domain-specification/pages/site";

await exportSite({
	sources: [{ workspace, fileLabel: "petstore.json", diagnostics: workspace.validate() }],
	outDir: "ods-site",
});
```
