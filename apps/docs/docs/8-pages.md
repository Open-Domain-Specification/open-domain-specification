# Pages

`@open-domain-specification/pages` is the one HTML renderer for ODS workspaces. It turns a
workspace and a ref into a page: a title, the body HTML, the section list for a table of
contents, and an anchor when the ref pointed at an element inside the page. Every host that
shows the model renders through it, so the VS Code detail panel, the static site export and
the browser viewer look the same and change together. See decision 12 in the repository for
the reasoning.

## Rendering a page

```ts
import { dotToSvg, renderPage } from "@open-domain-specification/pages";

const page = await renderPage({
	workspace,
	ref: "#/boundedcontexts/sales_bc/aggregates/order",
	fileLabel: "petstore.json",
	diagnostics: workspace.validate(),
	svg: dotToSvg,
});
// page.title, page.body, page.sections, page.anchor
```

Refs follow the workspace ref grammar. A leaf ref such as an entity or an attribute resolves
to its owner's page, and `page.anchor` names the element to scroll to. `resolvePage` exposes
that lookup on its own.

Diagrams are rendered through the `svg` function you pass in. `dotToSvg` uses the bundled
Graphviz wasm build and works in Node and in the browser.

## Static site

The `site` entry writes one HTML file per element with a navigation sidebar in place of the
extension's tree view:

```ts
import { exportSite } from "@open-domain-specification/pages/site";

await exportSite({
	sources: [{ workspace, fileLabel: "petstore.json", diagnostics: workspace.validate() }],
	outDir: "ods-site",
	svg: dotToSvg,
});
```

Links between pages are relative, so the output works from a `file://` URL or any static
host. The VS Code command `ODS: Export Static Site` runs this for every workspace file in the
`.ods` folder.

## Assets

The package ships `assets/page.css`, `assets/page.js`, `assets/site.css` and the codicons the
pages use. A host copies that folder and supplies a shell around the body. `page.css` reads the
VS Code theme variables; `site.css` defines them for light and dark outside the editor.
`page.js` detects its host: it posts messages to the extension when the VS Code API is
present and falls back to plain links otherwise.
