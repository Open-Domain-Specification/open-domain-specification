---
sidebar_position: 2
title: Strategic Design
---

# Strategic Design

The strategic side of the model answers "what do we compete on, who owns
what, and how do the parts relate".

## Problem space and solution space

Domains group **subdomains**, and each subdomain is classified as `core`,
`supporting` or `generic`. That is the problem space. **Bounded contexts**
are the solution space: they belong to the workspace and list the
subdomains they serve, so one context can span several subdomains and one
subdomain can be served by several contexts. `subdomain.addBoundedcontext`
is a shorthand for creating a context that serves that one subdomain.

## Teams

A workspace lists its **teams** and a context may be owned by one. The
context map prints the owner under each context and the generated docs list
what each team owns.

## Big ball of mud

A context whose model is not coherent, typically a legacy system, can be
flagged `bigBallOfMud`. It is drawn as a muddy blob so that neighbours know
to protect themselves with an anti-corruption layer.

## Context relationships

Relationships between contexts are declared on the workspace:

| Type | Direction | Meaning |
| --- | --- | --- |
| `upstream-downstream` | directed | the downstream context depends on the upstream one |
| `customer-supplier` | directed | as above, and the downstream team has a say in the upstream's plans |
| `partnership` | symmetric | the two teams plan and release together |
| `shared-kernel` | symmetric | the two contexts share part of their model |
| `separate-ways` | symmetric | the two contexts deliberately do not integrate |

Directed relationships carry the **roles** each side plays: upstream roles
are `open-host-service` and `published-language`, downstream roles are
`conformist` and `anti-corruption-layer`. The same roles appear on
individual consumables and consumptions.

Where two contexts exchange consumables and no relationship is declared, the
context map draws an **implied** upstream-downstream edge (dashed) with the
roles collected from the consumables involved. Declaring a relationship
replaces the implied edge.

```ts file=../../tests/strategic.example.test.ts
```
