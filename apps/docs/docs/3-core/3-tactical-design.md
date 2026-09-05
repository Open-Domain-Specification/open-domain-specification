---
sidebar_position: 3
title: Tactical Design
---

# Tactical Design

Inside a bounded context the model describes aggregates in the language of
event storming: operations cause change, events record it, policies react,
and a process is the reaction that remembers.
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

An attribute may be marked `optional`; absent means required, the common
case. An identity attribute is never optional — `identity-not-optional`
says an identity that may be missing is not an identity.

An attribute that holds an id says whose, with `identifies`: the entity it is
the identity of. That entity may be in another bounded context, and usually is
— a relation never crosses a boundary, so an identity attribute is the whole of
what one context knows about another's thing. It may also be a child rather
than a root: a playback session holds the id of a profile inside a household,
and the child stays inside its aggregate because its parent's invariants need
it there. You hold the child's id and reach it through its root, so the
dependency is on the aggregate that root leads. `identifies` keeps that
dependency structural rather than leaving it to a description: the relation map
draws it as a dashed edge to the entity named, inside that entity's own
aggregate cluster, and the `identifies-entity` rule checks the target is an
entity of this workspace.

Some ids belong to a system nobody here models inside — a card scheme's
authorisation reference, a payment provider's customer id. An external context
has no entities of ours to name, so `identifies` points at that context itself
and the maps draw the dependency on it. A context that is not external is
refused: there the entity exists, and it is what the id is of.

## Specialisation

An entity or value object may be a **kind of** another
(`entity.specialises(other)`): it has every attribute and relation of the
one it specialises, plus its own. An entity is a kind of an entity of its
own aggregate; a value object is a kind of one its own context declares, or
one it borrows through a shared kernel or as a conformist of the context that
owns it. A subtype is never itself `root: true` — a
kind of the root is reached through it — and does not redeclare an
attribute it already has from its parent. NorthBank's current, savings and
loan accounts, or StreamLine's films and series, are kinds of one account
or one title: one identity scheme and one set of invariants, with
attributes each kind has and the others do not.

## Relations and invariants

Entity relations (`includes`, `uses`, `references`) may carry a UML
cardinality: `1`, `0..1`, `*` or `1..*`. Across aggregates only `references`
is allowed and it must target the other aggregate's root, or a kind of that
root.

Invariants list what they **constrain**: entities, value objects, single
attributes, and the consumables of their own aggregate. A rule about a
transition — "once sold, a pet does not go back to available" — names the
operation that makes the transition, because that is where it is enforced;
the operation then reads as the rule it has to uphold. Invariants stay
prose; there is no expression language.

An invariant may instead belong to the bounded context rather than to one
aggregate: one open application per customer, one active offer per seller
and SKU, a daily transfer limit are true across instances, or across
aggregates, of a context — no single instance can see the others, so the
rule holds only because something checks it before acting. A context
invariant constrains entities and attributes of any aggregate in the
context and must name at least one operation of the context that guards it
(`context-invariant-guarded`); nothing it constrains may reach outside the
context (`invariant-in-context`). A rule across contexts is a policy or a
process reacting to the other context's events instead.

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

An operation may also list the schemas it `rejects` with: the shapes it
answers with when it refuses. A declined payment, a transfer over the daily
limit, a reservation the stock will not cover — nothing happened, so none of
these is an event, and a transport error stays outside the model. Each
rejection is a schema of the provider's own context, checked by
`schema-context` exactly as `schema` and `returns` are. Leave `rejects` off
when the operation always succeeds or refuses without a shape worth naming,
which is honest for most commands; an event never lists one, because a fact
that already happened has nothing left to refuse.

A consumable is published by default and carries the upstream `pattern` it
is offered under. Mark it `internal: true` when it is raised or handled
inside its own context and never offered to others: an internal operation is
a command only the context's own policies or application services issue, an
internal event is one the outside never sees. Consuming an internal
consumable from another context is a validation error.

## Consumptions

An aggregate or service **consumes** a consumable
(`node.consumes(consumable, { pattern })`), which is what draws the
dependency on the consumable map. The consumption may also say what of the
consumer makes it: `by` names the consumer's own operations, or policies of
its context. A subscription service calls the payment gateway when it
renews, not when it lists entitlements, and `by` is where that reads. Leave
`by` off when the whole consumer depends on the consumable, which is the
common case; it is optional detail, not a call graph.

## Policies

A **policy** lives on a bounded context and says "on these events, then
these operations" (`policy.on(...events).issues(...operations)`). The
consumables may belong to other contexts as long as they are not internal.
The flow map walks from the policies of a context through the events they
react to, the operations they issue and the events those raise.

## Processes

A **process** is the reaction that outlives one event
(`bc.addProcess(name, { description }).starts(...events).on(...events).issues(...operations).ends(...events)`).
A policy is stateless and any-of; a process remembers which of its events
have arrived, so it can wait for two facts before it acts, and it says what
finishes an instance. `starts`, `on` and `ends` may name another context's
events, exactly as a policy's `on` may; `then` names operations of the
process's own context. What it correlates on, how long it waits and what it
compensates are prose in its description: the model says a process exists
and what it listens to and does, and leaves how it decides to the code. An
author who finds a policy waiting for a second event promotes it to a
process.

## Glossary

Each context keeps its **ubiquitous language**: terms with a definition,
optional aliases, and optionally the element that embodies the term. The
doc generator produces a glossary page and the UI lists terms on each
context.

```ts file=../../tests/tactical.example.test.ts
```
