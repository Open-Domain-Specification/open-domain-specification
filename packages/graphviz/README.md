# @open-domain-specification/graphviz

A TypeScript library for generating Graphviz visualizations from Open Domain Specification (ODS) maps. This package provides utilities to convert domain models into visual diagrams using Graphviz's DOT format and SVG rendering.

## Features

- **Context Map Visualization**: Generate visual representations of bounded context relationships and patterns
- **Consumable Map Visualization**: Visualize service consumption patterns and relationships
- **Relation Map Visualization**: Create entity relationship diagrams with typed relationships
- **Multiple Output Formats**: Export diagrams as DOT format or SVG
- **Namespace Support**: Organize nodes into hierarchical namespaces with visual clustering
- **DDD Pattern Support**: Built-in styling for Domain-Driven Design patterns

## Installation

```bash
npm install @open-domain-specification/graphviz
```

## Usage

See the full Documentation for this package at

> http://localhost:3000/docs/graphviz/

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
- **ts-graphviz** - TypeScript Graphviz library for DOT generation
- **@hpcc-js/wasm-graphviz** - WebAssembly Graphviz renderer for SVG output
- **debug** - Debug logging utility

## License

ISC

## Contributing

This package is part of the Open Domain Specification project. Contributions are welcome following Domain-Driven Design principles and the existing code patterns.


