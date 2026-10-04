# ODS Doc

A TypeScript library for generating comprehensive Markdown documentation from Open Domain Specification (ODS) workspaces. This package automatically creates structured documentation with embedded diagrams, relationship tables, and navigation for domain-driven design projects.

<strong>
> 👀 Check out the ODS Example Workspace documentation and hosted Docsify site: https://eshop.open-ds.io
> https://github.com/Open-Domain-Specification/open-domain-specification/tree/main/models/petstore
</strong>

## Features

- **Hierarchical Documentation**: Generate complete documentation trees from workspace to aggregate level
- **Embedded Visualizations**: Automatically include context maps, consumable maps, relation maps and flow maps as SVG diagrams
- **Relationship Tables**: Context relationships (declared and implied), consumptions, entity relations with cardinality
- **Tactical Detail**: Attributes, commands, events, invariants and what they constrain, policies
- **Glossary**: A per-context glossary on each context page and a workspace-wide glossary page
- **Teams and Diagnostics**: Who owns each context, and the result of `workspace.validate()` on the workspace page
- **Navigation Structure**: Create sidebar navigation with proper hierarchy and cross-linking
- **A Complete Static Site**: An `index.html` docsify shell alongside the Markdown, so the folder renders on any static host
- **Breadcrumb Navigation**: Optional breadcrumb trails for easy navigation
- **Sets of Workspaces**: `toDocSet` documents a whole folder of workspace files, one folder of pages per file, with links between files and a first page that lists them
- **Multiple Component Types**: Support for workspaces, domains, subdomains, bounded contexts, services, and aggregates

## Installation

```bash
npm install @open-domain-specification/doc
```

## Usage

At its core the `@open-domain-specification/doc` package provides a single function `toDoc` that converts the workspace to a Dictionary of Markdown files. 

The function accepts an `ODSWorkspace` instance and returns a dictionary where keys are file paths and values are Markdown content.

See the [Example Workspace](https://github.com/Open-Domain-Specification/open-domain-specification/tree/main/models/petstore) for a complete example of how to use the `toDoc` function and generate documentation.

```ts file=../../tests/doc.example.test.ts
```

### Sidebar Navigation

The generated documentation includes a sidebar navigation structure that reflects the hierarchy of the ODS workspace. Each component type (workspace, domain, subdomain, bounded context, service, aggregate) has its own section in the sidebar. A bounded context is listed under every subdomain it serves, and contexts that serve no subdomain are listed directly under the workspace. The glossary page sits under the workspace.

This is crafted for ease of use with `Docsify` or similar documentation generators that support hierarchical navigation, however you can also create your own custom navigation structure based on the generated Markdown files.

### The Docsify Shell

Alongside the Markdown, `toDoc` writes an `index.html`: a docsify shell that loads docsify from a CDN, names the site after the workspace, points a bare `/` at the workspace page, and resolves each page's diagrams beside it. The folder is therefore a complete static site — drop it on any host, no `docsify serve` required.

A Playwright spec in the pages package (`packages/pages/e2e/docsify.spec.ts`) serves the generated petstore folder from a plain static server and walks every page in the sidebar, failing the build on a missing heading, a console error, or any request that 404s.

## A Set of Workspaces

`toDocSet` takes a `WorkspaceSet` (the files of a folder, see [Sets of Workspaces](../3-core/5-workspace-sets.md)) and returns the same kind of dictionary, for the whole set:

- **One folder of pages for each file.** Local ids repeat across files, so a page named only by its element would be two pages. The folder of a file is its path with the `.json` kept on the last name: `accounts.json/`, `team/payments.json/`. Every segment of a path is projected the way every other path here is, so a space, a `#`, a `%` or a non-ASCII character in a file or folder name becomes a bounded `_ods_<hex>` component rather than a character a file system or a URL might read differently. The inside of a folder is exactly what `toDoc` writes for one workspace. A name with a dot in it cannot be a page the model writes, so a folder cannot collide with one, and a directory (which has no dot) cannot collide with the folder of a file.
- **Links across files.** A consumption whose provider is in another file links to the provider's page in that file's folder; so do value-object and schema rows, glossary and subdomain links, and a context's relationships and consumers. A relationship is shown on the page of each context it is about, whichever file declares it.
- **A first page.** `index.md` lists the files in the order the set holds them (which a host gives in code point order of path), draws one context map across all of them with a cluster for each file, tabulates how the contexts relate and lists every diagnostic of the set with the file it is about, including a file the host offered that the set left out. `_sidebar.md` leads with it and nests each file's tree one level under it, and each file's own page has a link back.
- **Standalone stays standalone.** A set of one workspace is documented as that workspace alone, file for file as `toDoc` writes it. `toDoc` of a workspace that is one of several in a set throws and names `toDocSet`: written alone, its links to the other files would resolve to nothing.

The reference model NorthBank is generated this way: `models/northbank/docs` is `toDocSet` of the twelve files under `.ods`, read back from the folder in code point order, so its listings show what every other reader of the folder shows.

The order of a list that gathers across files follows the order of the files. Nothing can say otherwise: there is no order hint and no manifest. Renaming a file can reorder such a list, and the pages of a file are in a folder named after it.
