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