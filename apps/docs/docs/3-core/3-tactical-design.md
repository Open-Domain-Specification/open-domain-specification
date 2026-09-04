---
sidebar_position: 3
title: Tactical Design
---

# Tactical Design

Inside a bounded context the model describes aggregates in the language of
event storming: operations cause change, events record it, policies react.
Everything an aggregate or service offers is a **consumable**, typed `event`
or `operation`; the words command and event stay in prose, not as separate
objects.

## Value objects

A **value object** belongs to the bounded context
(`context.addValueObject(name)`), not to one aggregate: it is part of the
context's ubiquitous language, and every aggregate of the context may hold
one. Two contexts may share one only across a `shared-kernel` relationship.

## Attributes

Entities, value objects and schemas carry typed **attributes**. An
attribute has a free-form `type`, may be marked `identity` (for entities),
and may point at the shape that models its type: the value object it is a
value of, or the schema it nests. The two are mutually exclusive — a value
object is a concept of the context's own model, a schema a payload the
context publishes — and only a schema's attribute may name a schema: an
entity or a value object holds value objects, because a payload shape
belongs at the boundary rather than inside the model. A collection stays in
the type string (`OrderLine[]`), since there is no separate list construct.

## Relations and invariants

Entity relations (`includes`, `uses`, `references`) may carry a UML
cardinality: `1`, `0..1`, `*` or `1..*`. Across aggregates only `references`
is allowed and it must target the other aggregate's root.

Invariants list what they **constrain**: entities, value objects, single
attributes, and the consumables of their own aggregate. A rule about a
transition — "once sold, a pet does not go back to available" — names the
operation that makes the transition, because that is where it is enforced;
the operation then reads as the rule it has to uphold. Invariants stay
prose; there is no expression language.

## Schemas

A bounded context declares the payload shapes of its messages once, as
**schemas** (`context.addSchema(name)`), the way OpenAPI keeps them under
`components/schemas`. A schema has attributes like an entity does, and an
attribute may point at a value object or at another schema of the same
context, which is how a payload with a nested shape — an order with lines,
an address inside a customer — is modelled. Schemas belong to the context,
not the workspace, because a payload is part of a context's published
language. Any number of consumables may share one schema; the operation that
raises an event and the event itself commonly do.

## Events and operations

An aggregate or service **provides** consumables and nothing else crosses a
node boundary. An `event` consumable records that something happened; an
`operation` consumable is the intention to change something (a command or an
API call) and lists the events it may **raise** (`operation.raises(event)`).
Either may carry a `schema`: the payload the caller sends.

An operation may also declare a `returns` schema, the shape the caller gets
back. It is what makes a query modellable — `GetPetSummary` is asked with a
`PetId` and answers with a `PetSummary` — and both schemas belong to the
provider's own context. Leave `returns` off when the operation answers with
nothing worth naming, which is honest for most commands; an event never
declares one, because a fact announced to whoever is listening has no caller
to answer.

A consumable is published by default and carries the upstream `pattern` it
is offered under. Mark it `internal: true` when it is raised or handled
inside its own context and never offered to others: an internal operation is
a command only the context's own policies or application services issue, an
internal event is one the outside never sees. Consuming an internal
consumable from another context is a validation error.

## Policies

A **policy** lives on a bounded context and says "on these events, then
these operations" (`policy.on(...events).then(...operations)`). The
consumables may belong to other contexts as long as they are not internal.
The flow map walks from the policies of a context through the events they
react to, the operations they issue and the events those raise.

## Glossary

Each context keeps its **ubiquitous language**: terms with a definition,
optional aliases, and optionally the element that embodies the term. The
doc generator produces a glossary page and the UI lists terms on each
context.

```ts file=../../tests/tactical.example.test.ts
```
