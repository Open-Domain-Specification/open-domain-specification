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

## What the model leaves out on purpose

Several things a reader expects from Domain-Driven Design are not fields
here, on purpose: this model's own preferences about how a context is drawn,
not consequences of DDD itself, chosen because they keep the maps and the
reaction walk readable and checkable. There is no `delivery` flag on a
consumable — type is kind, not delivery. There are no coordination fields on
a process — what it correlates on and what it undoes are prose. There are no
modules — a context is the namespace, flat inside it. There are no actors —
who calls an operation is a sentence in its description, not a model
element. There is no read-model element — a projection is a query service
like any other. A value object declares no operations — a value's behaviour
is its invariants and description, not a consumable. An entity has one home
— it belongs to exactly one aggregate of exactly one context, even where two
contexts jointly own it. And a context invariant records who checks it, not
how strongly the store holds it. See
[decision 15](https://github.com/Open-Domain-Specification/open-domain-specification/blob/main/decisions/15-what-the-model-leaves-out.md)
and the rest of the
[`decisions/`](https://github.com/Open-Domain-Specification/open-domain-specification/tree/main/decisions)
folder for the reasoning behind each of these, and where a review would find
the argument rather than the absence.

## Value objects

A **value object** belongs to the bounded context
(`context.addValueObject(name)`), not to one aggregate: it is part of the
context's ubiquitous language, and every aggregate of the context may hold
one. Two contexts may share one only across a `shared-kernel` relationship.

A value provides no operations. A consumable is what a node offers across
its own boundary, and a value's behaviour crosses nothing: it is its
invariants and its description, not a callable surface of its own.

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
and the maps draw the dependency on it. Where that system publishes a schema
for the kind the id names — a processor documents Customer, Payment, Refund and
Dispute as distinct kinds with distinct ids — `identifies` may name that schema
instead, and the model still reads it as an identity into that context. A
context that is not external is refused, and so is a schema of one: there the
entity exists, and it is what the id is of.

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

A relation's label is a phrase the relation map draws ("lives at", "in
arrears of"). Where one entity uses the same value object for more than one
attribute — a customer's current address beside its address history — the
relation says which attribute it draws with `for`, and the validator pairs
each attribute with its relation by that rather than by the phrase.

Invariants list what they **constrain**: entities, value objects, single
attributes, and the consumables of their own aggregate. A rule about a
transition — "once sold, a pet does not go back to available" — names the
operation that makes the transition, because that is where it is enforced;
the operation then reads as the rule it has to uphold. Invariants stay
prose; there is no expression language.

Naming an operation says which operation keeps the rule, and nothing more. A
rule checked before that operation runs and not kept true afterwards — enough
funds at initiation, an entitlement at playback start — says so with
`precondition: true`, and must name the operation it guards
(`precondition-names-operation`). A guarantee about what the call answers with
— every returned itinerary meets the requested deadline — is the mirror of it
and says so with `postcondition: true`
(`postcondition-names-operation`); the two are exclusive, because one is about
the moment before the call and the other about what comes back. Without either
flag the rule is still true after the operation it names: `PostEntry` must
produce balanced postings, and the postings stay balanced.

Both may reach the payload the call carries. A precondition may constrain the
attributes of the schema its guarded operation takes, and those of what a call
that guard — or the front that calls it in the same context — already made
comes back with: "approve only if the customer is in good standing" reads a
standing another context answered with before this call began, and the shape it
came back in is a fact this context holds. It may not name this call's own
answer, which does not exist when the check runs, nor the other context's
entities, which are never in reach. A postcondition constrains what its
operation returns or rejects with, and the request it relates them to. Either
follows composition: a rule about the amount of an order line is a rule about
the request that holds the lines. No other invariant may name a schema's
attribute at all — a rule kept true on every save is a rule about the model,
and a transport shape is not the model.

An invariant may instead belong to a value object. A rule that is about a
value alone — an IBAN's mod-97 checksum, a Money's single currency — holds by
construction: a value that breaks it is never made, so no save keeps it and no
operation guards it. It constrains that value object's own attributes and
nothing else (`invariant-in-value-object`); a rule that reaches for the entity
holding the value is that aggregate's.

An invariant may instead belong to the bounded context rather than to one
aggregate: one open application per customer, one active offer per seller
and SKU, a daily transfer limit are true across instances, or across
aggregates, of a context — no single instance can see the others, so the
rule holds only because something checks it before acting. A context
invariant constrains entities and attributes of any aggregate in the
context and must name at least one operation of the context that checks it
(`context-invariant-is-checked`); nothing it constrains may reach outside the
context (`invariant-in-context`). It is always a check, and the model records
who checks it, not how strongly the store holds it: whether a unique index or
a serialisable transaction also keeps the same rule true at the database
layer is not what this says, because the aggregate is the model's only unit
of consistency and a context invariant may not claim to be kept on every save
the way an aggregate's is. A check is made on one side of the call or the
other, and the rule says which with `precondition` or `postcondition`: a
quotation service that stores nothing has no aggregate to hold the contract
of its own operation, so the context holds it — the weight is checked
before, the quote against the tariff after. A rule across contexts is a
policy or a process reacting to the other context's events instead: a
wallet's balance and an escrow account's balance in a different context can
never be compared inside one save, so keeping them equal is a policy of one
context that reacts to the other's postings and issues its own reconciling
operation, not an invariant reaching across the boundary.

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

On an `external` context, a schema is also one of the kinds that system
publishes — a processor documents Customer, Payment, Refund and Dispute as
distinct kinds with distinct ids — and `identifies` may name that schema
directly, which still reads as an identity into that context rather than an
invented entity inside a system we do not own.

## Events and operations

An aggregate or service **provides** consumables and nothing else crosses a
node boundary. An `event` consumable records that something happened; an
`operation` consumable is the intention to change something (a command or an
API call) and lists the events it may **raise** (`operation.raises(event)`).
Either may carry a `schema`: the payload the caller sends. Write
`schema: { of: shape, many: true }` where the request is a list of that shape
rather than one of it, as a bulk create is: a root array and an object holding
an array are different shapes, and only the mark tells them apart.

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

A refusal may name the outcomes the contract enumerates for it, in the
contract's own words: `rejects: [{ schema, reasons: ["insufficient_funds",
"issuer_unavailable"] }]`. One shape with a code in it gave a caller one branch
whatever the code said, and a schema per code would say the contract has
several shapes when it has one. Each reason is an answer a policy or a process
may wait on by itself — `operation.rejected(schema, reason)` — beside the
shape-level `operation.rejected(schema)`, which hears them all. A reason is a
named outcome, never a condition on data: how the caller decides what to do
about it stays in the code.

A consumable is published by default and carries the upstream `pattern` it
is offered under. Mark it `internal: true` when it is raised or handled
inside its own context and never offered to others: an internal operation is
a command only the context's own policies or application services issue, an
internal event is one the outside never sees. Consuming an internal
consumable from another context is a validation error.

`type` is kind, not delivery: there is no `delivery` flag, because an event
is a fact and an operation is an intent, whatever carries either one. A
command carried over a queue is still an operation — the caller does not
wait synchronously, but the model records what it is, not how it travels; a
comment on the consumption says so where it matters.

An operation people call through a screen is consumed by nobody in the
model, and that is the normal case: most of a system's public surface is
exactly that. Who may call it is a sentence in its description, not a field,
and a maker-checker rule is an invariant in prose on the operation it
guards.

## Consumptions

An aggregate or service **consumes** a consumable
(`node.consumes(consumable, { pattern })`), which is what draws the
dependency on the consumable map. The consumption may also say what of the
consumer makes it: `by` names the consumer's own operations, or policies of
its context. A subscription service calls the payment gateway when it
renews, not when it lists entitlements, and `by` is where that reads. Leaving
`by` off means the whole consumer, which is fine where the consumer provides
one operation or none, because there is nothing to choose between; where it
provides two or more, `consumption-by-required` asks which of them makes the
call. `by` is the one causal link the model has from one operation to the
next, so without it the reaction walk and the flow map stop there and an
answer to the call reaches nobody.

## Policies

A **policy** lives on a bounded context and says "on these events, then
these operations" (`policy.on(...events).issues(...operations)`). The
consumables may belong to other contexts as long as they are not internal.
`on` may also name an answer of an operation this context consumes
(`operation.returned()`, `operation.rejected(schema)`,
`operation.completed()`), which means "when that answer comes back": a call is
answered and the reaction is to the answer, not to an event somebody invented
for it. An operation that returns nothing still comes back, and
`completed()` is that answer — one with no shape, which is the whole of what
the caller of a command learns. An answer is named by the call it comes
back from, never by the shape alone, so two operations refusing with one shared
schema wake only whoever named the call that was made.
The flow map walks from the policies of a context through what they react
to, the operations they issue and the events those raise.

## Processes

A **process** is the reaction that outlives one event
(`bc.addProcess(name, { description }).starts(...events).on(...events).issues(...operations).ends(...events)`).
A policy is stateless and any-of; a process remembers which of its events
have arrived, so it can wait for two facts before it acts, and it says what
finishes an instance. `starts` names the event, or the operation of this
context, that creates an instance: a command starts a saga as often as a fact
does — open a claim, submit an application — and a starting command is this
context's own, though a starting event may be a neighbour's. `starts`, `on`
and `ends` may name another context's events, exactly as a policy's `on` may,
and `on` and `ends` may name an answer of an operation this context calls,
which is what the commonest process is made of: it calls, waits, and branches
on what came back. `then` names operations of the process's own context.
Whether the events named in `on` must all arrive before the process acts, or
any one of them is enough, is not a flag: like what a process correlates on
and what it compensates, that is prose in its description, on purpose — the
model says a process exists and what it listens to and does, and leaves how
it decides to the code.

A process may also keep its own **`deadlines`**, by id: a time limit on one
of its instances, stated the business's own words with `after` ("30
minutes", "two working days") and, optionally, `from`, the process's own
`starts` or `on` entry the interval counts from — absent means from the
moment the instance began. A deadline behaves as an event the process raises
to itself, so `on` and `ends` may wait on or end on it exactly as they do on
any other event, and nothing outside the process may name it. What undoes
the deadline, pausing or clearing the clock, is prose in its description
rather than a field, for the same reason the process's other decisions are:
the model states when a clock starts and how long it runs, not the
conditions that stop it. An author who finds a policy waiting for a second
event promotes it to a process.

## Read models

There is no `ReadModel` element. A projection is a **query service** like
any other: a policy of the context reacts to the events that feed the view
and issues an internal operation that writes what the query later reads, and
the query operation itself declares `returns` the view's own shape.
Petstore's inventory projection is a bounded context of its own because it
serves two subdomains, not because the model forced a construct it does not
have.

## Glossary

Each context keeps its **ubiquitous language**: terms with a definition,
optional aliases, and optionally the element that embodies the term. The
doc generator produces a glossary page and the UI lists terms on each
context.

```ts file=../../tests/tactical.example.test.ts
```
