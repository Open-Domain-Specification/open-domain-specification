---
status: Accepted
date: 2026-09-06
---
# Decision 15 — What the model deliberately leaves out, and why

## Context

The model is written from an interview with the people who own a domain, in their own words, and read back by architects, developers and product people on one page per element. Every field is a question the interview must ask and a row a reader must scan. An external review of the metamodel (2026-09-05) listed several constructs it expected and did not find. Some were real gaps and became decisions 13 and 14. The rest are deliberate, and this record says so in one place so the next review finds the reasoning rather than the absence.

## Decisions

### Policies stay stateless; there is no saga or process-manager construct

A policy is `on` events, `then` operations, and `on` is any-of: the policy fires when any listed event happens. Correlation across several events is a process, not a policy. Correlation state, deadlines, compensation and data-dependent branching are not modelled. Each would turn "when X happens, what do you do?" into four questions per policy (wait for what, for how long, then what, and how do you undo it), and most authors' honest answer is that they have not decided, which leaves fields empty and empty-state sentences multiplying. A multi-step process is already traversable: an operation raises an event, a policy reacts, another operation runs, and the consumable page shows both Raises and Reacted-to-by. A timeout is an event nobody raises, and the model already asks whether such an event is ever emitted. If a real model needs more, it models the process as an aggregate with internal operations, which petstore's order approval already does. Revisit only when two reference models cannot say what they need.

### Delivery is implied by the consumable's type

An event is asynchronous; an operation is a call the caller waits on. There is no `delivery` flag, because it would restate `type` on nearly every consumable and add a fourth mark to port badges that already carry role, disposition and implied-edge marks. The rare exception, a command carried over a queue, is what a comment on the consumption is for (RFC-002), where the author can also say why.

### Commands and operations are one thing (decisions 09 and 11)

A command to an aggregate and an operation on an application service turned out to be the same element seen from two sides, and decision 09 merged them. Whether an operation is internal or offered across a boundary is `internal`; whether it is domain or application is the provider's type; whether an event is a domain event or an integration event is `internal` plus its `pattern`. No further vocabulary is added.

### Attribute types are free text; invariants are prose

`AttributeSchema.type` is a string in the author's words (`int64`, `'available' | 'pending' | 'sold'`, `string (URL)`), and an invariant is a name, a sentence and the elements it constrains. A primitive vocabulary and an expression language would move the model from the author's language into code, which loses the product reader and verifies nothing the code's own tests do not. The one omission worth its cost, an optional flag on an attribute, is deferred until a reference model needs it.

### Read models are query services

A projection is a service that provides a query operation; with decision 13 that operation says what it returns. No `ReadModel` construct is added. Petstore's inventory projection is a bounded context of its own because it serves two subdomains, not because the model forced it.

### Context maps cluster by primary subdomain (decision 02)

A context serving several subdomains draws in the cluster of its first; the others are links. The cluster is a visual namespace, not a claim of exclusivity.

### There is no subtyping between entities or value objects

Relations are `references`, `includes` and `uses`; there is no `extends`. A class hierarchy is an implementation choice, and in a domain model it usually hides a missing concept: the kinds of account, or the formats of a title, are better said as a value object with a closed set of values, or as separate aggregates when they behave differently. Modelling a hierarchy as `includes` would be wrong, so the model refuses rather than misdraws. Reopened only if a reference model cannot name its concept without inheritance.

### An aggregate is a boundary; its root is the entity you reach it by

An aggregate has its own name and description because it is more than its root: it holds the entities, value objects, invariants and consumables inside one consistency boundary. Relations target the root entity because a relation is between entities; provisions target the aggregate because a consumable belongs to the boundary, not to one entity. Naming the root after the aggregate is a convention, not a duplication, and a reader sees both on one page.

### A context has no modules

Aggregates, services, policies and schemas are flat within a context. A context with dozens of aggregates is the model saying it should be more than one context, or that its subdomain should be split; adding a folder would hide that. Reopened if a reference model has a context that genuinely needs an internal grouping the reader cannot get from ordering and description.

## Consequences

- A review that expects these constructs should find this record and argue with its reasoning rather than report their absence.
- Each section names the condition under which it would be reopened.
