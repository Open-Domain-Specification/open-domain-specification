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

## Context flags

A context whose model is not coherent, typically a legacy system, can be
flagged `bigBallOfMud`. It is drawn as a muddy blob so that neighbours know
to protect themselves with an anti-corruption layer (`mud-needs-acl`).

A context the enterprise does not own and does not model inside — a card
scheme, a payment provider, a licensor, a regulator, a clock — can be
flagged `external`. It may still provide and consume consumables and take
part in relationships, but it needs no subdomain, no team and no internals:
`external-is-boundary` refuses aggregates, policies, processes and
invariants on it, because what happens inside it is not ours to state.

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

A downstream that declares the `conformist` role says it takes the upstream's
model as it stands, so it may name that upstream's schemas and value objects
directly — the one borrowing that runs in a single direction, downstream from
upstream. That is how an external system's formats enter a model without
anybody pretending they are ours, and `conformist-backed` asks in return that
the two contexts really exchange something.

Two contexts sharing a library declare `shared-kernel` directly between
them. When several contexts share one library, model the library as a
bounded context of its own and give each sharer a `shared-kernel`
relationship with that context, rather than one relationship per pair: six
contexts sharing a financial-primitives library are six relationships to
one kernel context, not fifteen among themselves.

Where two contexts exchange consumables and no relationship is declared, the
context map draws an **implied** upstream-downstream edge (dashed) with the
roles collected from the consumables involved. An identity attribute naming
another context's entity implies an edge in the same way, marked `«id»` and
carrying no roles, since nothing is exchanged; so does an identity naming an
external context, which is how an id belonging to a system nobody here models
inside still shows as a dependency. Declaring a relationship
replaces the implied edge, and `relationship-declared` warns until one is.

```ts file=../../tests/strategic.example.test.ts
```
