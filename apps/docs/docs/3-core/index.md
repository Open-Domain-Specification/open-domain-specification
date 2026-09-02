---
sidebar_position: 1
title: ODS Core
content_guide:
  purpose: To introduce the foundational concepts of ODS Core, its role in Domain-Driven Design (DDD), and how it fits into the broader Open Domain Specification (ODS) ecosystem.
  audience:
    - Software developers
    - Architects
  tone: Clear, welcoming, and foundational
  emotion:
    - Discovering a structured approach to modeling
    - Gaining confidence in domain modeling
    - Feeling empowered to create shared understanding using domain modeling as code
  takeaway:
    - Understanding the foundational concepts of ODS Core
    - Understanding where ODS Core fits in the broader ODS ecosystem
---

# ODS Core

The **Open Domain Specification (ODS) Core** package provides the foundation for modeling complex domains with Domain-Driven Design (DDD) principles. It serves two main purposes:

1. **Schema Types** – ODS Core defines the types that make up the JSON Schema specification itself. These types form the authoritative, open standard for describing domains.

2. **TypeScript Toolkit** – Beyond the specification, ODS Core offers a set of TypeScript wrappers and classes to make it easier to construct domain models directly in code. These utilities provide a practical, developer-friendly way to create, validate, and share domain models as code.

The advantage of this open approach is that once defined, schemas can be applied across many downstream use cases, such as:

- 🗺️ **Domain Visualization**: Tools that visualize domain models as diagrams or graphs
- 🏗️ **Scaffolding**: Generating code templates based on domain models
- 📄 **Documentation**: Automatically generating documentation from domain models
- ✨ **GenAI**: Using domain models to inform AI systems about the high level business intent and how the implementation should align with it

## Domain Hierarchy

The ODS core follows a hierarchical structure aligned with Domain-Driven Design principles:

```
Workspace
├── Domain                                  (problem space)
│   └── Subdomain (core/supporting/generic)
├── Bounded Context                         (solution space; serves one or more subdomains)
│   ├── Service (application/domain/infrastructure)
│   │   ├── Consumables
│   │   └── Consumptions
│   ├── Glossary Term                       (ubiquitous language, optionally embodied by an element)
│   ├── Policy                              (on Domain Events → then Commands)
│   └── Aggregate
│       ├── Entities (with attributes)
│       ├── Value Objects (with attributes)
│       ├── Invariants
│       ├── Commands (with attributes; raise Domain Events)
│       ├── Domain Events (with attributes)
│       ├── Consumables (an event consumable publishes a domain event; an operation may expose a command)
│       └── Consumptions
├── Team                                    (owns bounded contexts)
└── Context Relationship                    (upstream-downstream, customer-supplier, partnership, shared-kernel, separate-ways)
```

Domains and subdomains describe the *problem space*. Bounded contexts describe
the *solution space* and are owned by the workspace, each linked to the
subdomains it serves, so one context can span several subdomains and one
subdomain can be served by several contexts.

## Installation

```bash
npm install @open-domain-specification/core
```

## Building a Domain Model

Using the Typescript API you can build domains using Typescript so they can be maintained as code.

Finally, once the domain model is defined, it can be exported as a JSON document and used for visualization, documentation, or other purposes.

```ts file=../../tests/model.example.test.ts
```