# @open-domain-specification/core

The foundational TypeScript library for building and modeling Domain-Driven Design (DDD) architectures using the Open Domain Specification (ODS) specification. This package provides the core domain model, visitor patterns, and mapping utilities for representing complex domains.

## Features

- **Complete DDD Domain Model**: Full hierarchy from workspace to entities with proper relationships
- **Schema Serialization**: Convert domain models to/from JSON schema for persistence and interchange
- **Schema Visitor**: Traverse and analyze domain models with built-in visitor support
- **Context Mapping**: Generate context maps showing bounded context relationships
- **Consumption Analysis**: Track and visualize service consumption patterns
- **Relation Mapping**: Model entity relationships within aggregates
- **Reference System**: Comprehensive reference resolution across the entire domain model
- **Type Safety**: Full TypeScript support with detailed type definitions

## Installation

```bash
npm install @open-domain-specification/core
```

## Usage

See the full Documentation for this package at 

> https://docs.open-ds.io/docs/core/

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

- **object-hash** - Used for generating stable hashes for edges and relationships
- **debug** - Debug logging utility

## License

ISC

## Contributing

This is the foundational package of the Open Domain Specification project. Contributions should maintain backward compatibility and follow Domain-Driven Design principles. All changes should include appropriate tests and maintain the existing API contracts.