# ODS Doc

A TypeScript library for generating comprehensive Markdown documentation from Open Domain Specification (ODS) workspaces. This package automatically creates structured documentation with embedded diagrams, relationship tables, and navigation for domain-driven design projects.

<strong>
> 👀 Check out the ODS Example Workspace documentation and hosted Docsify site: https://eshop.open-ds.io
> https://github.com/Open-Domain-Specification/open-domain-specification/tree/main/packages/ods-example-ws
</strong>

## Features

- **Hierarchical Documentation**: Generate complete documentation trees from workspace to aggregate level
- **Embedded Visualizations**: Automatically include context maps, consumable maps, and relation maps as SVG diagrams
- **Relationship Tables**: Generate tables showing consumption patterns and relationships between components
- **Navigation Structure**: Create sidebar navigation with proper hierarchy and cross-linking
- **Breadcrumb Navigation**: Optional breadcrumb trails for easy navigation
- **Multiple Component Types**: Support for workspaces, domains, subdomains, bounded contexts, services, and aggregates

## Installation

```bash
npm install @open-domain-specification/doc
```

## Usage

At its core the `@open-domain-specification/doc` package provides a single function `toDoc` that converts the workspace to a Dictionary of Markdown files. 

The function accepts an `ODSWorkspace` instance and returns a dictionary where keys are file paths and values are Markdown content.

See the [Example Workspace](https://github.com/Open-Domain-Specification/open-domain-specification/tree/main/packages/ods-example-ws) for a complete example of how to use the `toDoc` function and generate documentation.

```ts file=../../tests/doc.example.test.ts
```

### Sidebar Navigation

The generated documentation includes a sidebar navigation structure that reflects the hierarchy of the ODS workspace. Each component type (workspace, domain, subdomain, bounded context, service, aggregate) has its own section in the sidebar.

This is crafted for ease of use with `Docsify` or similar documentation generators that support hierarchical navigation, however you can also create your own custom navigation structure based on the generated Markdown files.