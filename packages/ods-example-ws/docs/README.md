# Swagger Petstore (v3) - Example ODS Workspace

This is an example workspace demonstrating how to model the [Swagger Petstore API](https://petstore.swagger.io/) using the Open Domain Specification (ODS) framework.

## Domain Model

The workspace is organized using Domain-Driven Design principles:

### Petstore Commerce (Core Domain)
- **Catalog**: Pet definitions, attributes, lifecycle
- **Sales**: Orders and order lifecycle  
- **Inventory**: Aggregated availability by status

### Identity & Accounts (Supporting Domain)
- **Users**: User records and login/logout

## Navigation

Use the sidebar to explore the complete domain model, including:
- Domain contexts and their relationships
- Bounded contexts with their services and aggregates
- Value objects, entities, and business invariants
- Event flows and API operations

This model demonstrates how the familiar Swagger Petstore API can be structured using DDD patterns and ODS specifications.