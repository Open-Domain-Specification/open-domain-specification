---
sidebar_position: 3
title: Tactical Design
---

# Tactical Design

Inside a bounded context the model describes aggregates in the language of
event storming: commands cause change, events record it, policies react.

## Attributes

Entities, value objects, events and commands carry typed **attributes**. An
attribute has a free-form `type`, may be marked `identity` (for entities),
and may point at the value object that models its type.

## Relations and invariants

Entity relations (`includes`, `uses`, `references`) may carry a UML
cardinality: `1`, `0..1`, `*` or `1..*`. Across aggregates only `references`
is allowed and it must target the other aggregate's root.

Invariants list what they **constrain**: entities, value objects or single
attributes.

## Commands and events

An aggregate's **commands** are the intentions to change it; each lists the
**domain events** it may raise. Both are tactical elements inside the
aggregate. Integration with other contexts still goes through consumables:
an operation consumable may reference the command it exposes and an event
consumable references the event it publishes (`aggregate.publishes(event)`
creates one).

## Policies

A **policy** lives on a bounded context and says "on these events, then
these commands". The events and commands may belong to other contexts. The
flow map walks from the policies of a context through the events they react
to, the commands they issue and the events those raise.

## Glossary

Each context keeps its **ubiquitous language**: terms with a definition,
optional aliases, and optionally the element that embodies the term. The
doc generator produces a glossary page and the UI lists terms on each
context.

```ts file=../../tests/tactical.example.test.ts
```
