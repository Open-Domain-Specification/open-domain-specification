---
sidebar_position: 1
title: Overview
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
├── Bounded Context                         (solution space; serves the subdomains it lists)
│   ├── external / bigBallOfMud             (a system we do not own / one of ours we cannot read; mutually exclusive)
│   ├── Service (application/domain)
│   │   ├── Consumables (event or operation; may be internal; an operation may declare returns, rejects and reasons)
│   │   └── Consumptions
│   ├── Glossary Term                       (ubiquitous language, optionally embodied by an element)
│   ├── Value Object (with attributes)      (a value of the context's language; any aggregate may hold one)
│   │   └── Invariants                      (rules the value keeps by construction)
│   ├── Schema                              (payload shape with attributes, shared by consumables; a published kind on an external context)
│   ├── Policy                              (on event consumables → then operation consumables)
│   ├── Process                             (starts/on/then/ends; holds state across events, unlike a policy)
│   │   └── Deadlines (after, from)         (a time limit the process raises to itself)
│   ├── Context Invariant                   (a rule across instances or aggregates of this context; names its guard)
│   └── Aggregate
│       ├── Entities (with attributes)
│       ├── Invariants
│       ├── Consumables (event or operation; may be internal, carry a schema, and operations raise events)
│       └── Consumptions
├── Team                                    (owns bounded contexts)
└── Context Relationship                    (upstream-downstream, customer-supplier, partnership, shared-kernel, separate-ways)
```

Domains and subdomains describe the *problem space*. Bounded contexts describe
the *solution space* and are owned by the workspace, each linked to the
subdomains it serves, so one context can span several subdomains and one
subdomain can be served by several contexts.

A good number of things this tree does *not* show — no delivery flag, no
modules, no actors, no read-model element, no operations on a value object,
an entity has one home, a context invariant records the check rather than
the store — are left out on purpose, not because DDD forbids them. See
[Tactical Design](3-tactical-design.md#what-the-model-leaves-out-on-purpose)
and the repository's
[`decisions/`](https://github.com/Open-Domain-Specification/open-domain-specification/tree/main/decisions)
folder, starting with
[decision 15](https://github.com/Open-Domain-Specification/open-domain-specification/blob/main/decisions/15-what-the-model-leaves-out.md),
for the reasoning behind each one.

## Identity and refs

Every element has an `id` that becomes its key in the JSON document and the
last segment of its ref, for example `#/boundedcontexts/sales/aggregates/order`.
When you omit `id` in the DSL it is derived from the name (`"Order Line"`
becomes `order_line`); pass `id` explicitly when a name is likely to change
and other elements point at it. When a document is loaded, the JSON keys are
the ids, so a document round-trips regardless of how its names are spelled.

Refs never embed the domain or subdomain of a bounded context, so renaming
those never breaks a ref.

## Reference models

The `models/` workspace folder in the repository holds five packages, each a
workspace written with the DSL and generated into a `.ods/*.json` file used by
the viewer, the export and the test fixtures:

- **Swagger Petstore** is the demonstration reference. Every feature of the
  model appears once, descriptions say why each choice was made, and it
  validates clean. Read this one first.
- **RiverMart**, a fictional online marketplace, **StreamLine**, a fictional
  streaming service, and **NorthBank**, a fictional retail bank, are stress
  models: large enough to exercise the pages, the diagrams and the validation,
  with a legacy big ball of mud, shared kernels and partnerships, deep
  aggregates, and a few deliberate structural problems so diagnostics have
  something to show. Between them the three trigger every rule in the catalog.
- **Clinic**, an outpatient clinic, is modelled blind from the skill and the
  docs alone, with no other reference model read first: it is the check that
  the guidance in this repository is enough on its own to produce a sound
  workspace.

Each fictional organisation comes with a `BRIEF.md` describing the business
and a `DISCOVERY.md` recording the interviews and event-storming session the
model was drawn from, so every context, relationship, invariant and policy
can be traced back to something someone said.

## Installation

```bash
npm install @open-domain-specification/core
```

## Building a Domain Model

Using the Typescript API you can build domains using Typescript so they can be maintained as code.

Finally, once the domain model is defined, it can be exported as a JSON document and used for visualization, documentation, or other purposes.

```ts file=../../tests/model.example.test.ts
```