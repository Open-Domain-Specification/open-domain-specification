# @open-domain-specification/doc

A TypeScript library for generating comprehensive Markdown documentation from Open Domain Specification (ODS) workspaces. This package automatically creates structured documentation with embedded diagrams, relationship tables, and navigation for domain-driven design projects.

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

See the full Documentation for this package at

> https://docs.open-ds.io/docs/docs/

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm test
```

## Dependencies

- **@open-domain-specification/core** - Core domain modeling types and classes
- **@open-domain-specification/graphviz** - Graphviz visualization generation

## License

ISC

## Contributing

This package is part of the Open Domain Specification project. Contributions are welcome following Domain-Driven Design principles and maintaining consistency with the existing documentation patterns.
