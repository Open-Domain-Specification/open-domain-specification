---
sidebar_position: 4
title: Validation
---

# Validation

`workspace.validate()` checks the structural rules that DDD lets us verify
without knowing the business, and returns a list of diagnostics with a
severity, a rule id, a message and the ref of the element concerned.

| Rule | Severity | Checks |
| --- | --- | --- |
| `aggregate-root` | error / warning | exactly one root entity per aggregate |
| `cross-aggregate-reference` | error | relations into another aggregate are `references` to its root, or a kind of that root; a relation to a value object crosses no aggregate, since the context declares it |
| `cross-context-relation` | error | a relation never crosses a bounded context; the source holds the other entity's identity instead |
| `identifies-entity` | error | an attribute's `identifies` names an entity of this workspace, root or child, or a bounded context marked `external`; a child is reached through its own root, so the dependency is on the aggregate that root leads, and an external context is named when the id belongs to a system whose entities are not ours to state |
| `root-identity` | error | an aggregate's root entity declares at least one identity attribute |
| `entity-identity` | warning | every other entity in an aggregate declares at least one identity attribute; without one it is a value object |
| `value-object-shape` | error | a value object declares no identity attribute and includes nothing |
| `identity-not-optional` | error | an identity attribute is not marked `optional`; an identity that may be missing cannot say which instance a reference means |
| `specialisation-in-boundary` | error | an entity is a kind of an entity of its own aggregate; a value object is a kind of one its own context declares, or one it borrows through a shared kernel or as a conformist of the context that owns it |
| `specialisation-cycle` | error | no chain of "is a kind of" returns to where it started |
| `specialisation-not-root` | error | an entity that is a kind of another is not itself marked root |
| `specialisation-redeclares` | error | a kind does not declare an attribute it already has from what it is a kind of |
| `aggregate-tree` | error / warning | inside an aggregate `includes` points at entities and `uses` at value objects, and every entity is reachable from the root. The tree is a claim about instances and the model declares types, so no ring among types is reported at all: a questionnaire whose groups hold questions that hold groups is still a finite tree per instance |
| `attribute-relation-coherence` | warning | an attribute typed by a value object has the matching `uses` relation, and the two agree about number. Presence is not size, so the pairings are `*` or `1..*` for a list whether or not it is optional, `1` for a required attribute that is not a list, `0..1` for an optional one that is not a list. Where several relations point at one value object, the relation whose `for` is the attribute's name is the match, and the label stays a phrase. The type itself is free text and is never checked against the value object's name |
| `relation-for-resolves` | error | a relation's `for` names an attribute of the entity or value object that declares the relation; an attribute inherited from what it is a kind of counts as its own |
| `attribute-one-shape` | error | an attribute is typed by a value object or by a schema, never by both, and only a schema's attribute names a schema: a payload shape belongs at the boundary, so an entity or value object names a value object |
| `invariant-in-value-object` | error | every element a value object's invariant constrains is one of that value object's own attributes, or the value object itself: a value's rule holds by construction and reaches nothing outside the value |
| `invariant-in-aggregate` | error | every element an invariant constrains is inside the invariant's own aggregate — an entity, an attribute or one of its consumables — or is a value object of its context, or one borrowed from another context that something in the aggregate holds |
| `invariant-in-context` | error | every element a context's invariant constrains belongs to that context: an entity or attribute of any of its aggregates, one of its value objects or a borrowed one its aggregates hold, or one of its operations |
| `context-invariant-guarded` | error | a context's invariant names at least one operation of that context as a guard |
| `relationship-roles-backed` | warning | a directed relationship's declared roles are carried by real crossings, and a crossing consumption's role is declared on the relationship; a crossing consumable's `schema` backs a `published-language` role |
| `relationship-declared` | warning | two contexts joined by a crossing — a consumption of the other's consumable, a policy or process reacting to the other's event, or an identity naming the other's entity — declare a relationship in that direction |
| `relationship-duplicate` | error | a pair of contexts declares at most one relationship of each type and direction; a symmetric type has no direction, so either order counts as the same one |
| `relationship-cycle` | warning | the directed relationships whose traffic is calls form no cycle; a step carried only by events is choreography, and a step whose downstream declares an anti-corruption layer translates at its edge, so neither counts (decision 20). The message lists the ring's contexts in order |
| `partnership-backed` | warning | two contexts declaring a partnership exchange consumables, or events a policy reacts to, in at least one direction |
| `shared-kernel-backed` | warning | two contexts declaring a shared kernel share at least one value object or schema across it |
| `conformist-backed` | warning | a downstream that declares the `conformist` role takes something of its upstream's: a schema or value object named here, something it publishes consumed here, or one of its operations called |
| `mud-needs-acl` | warning | a consumption from a big ball of mud is translated behind an anti-corruption layer |
| `term-in-context` | error | a glossary term's `embodiedBy` names an element of the term's own context |
| `role-coherence` | warning | consumables and consumptions crossing contexts declare their roles, unless the two contexts are partners or share a kernel |
| `separate-ways` | error | contexts that declared separate ways exchange no consumables, and neither reacts to the other's events |
| `internal-consumable` | error / warning | an internal consumable is not consumed, reacted to or issued from another context |
| `consumption-once` | error | a consumer consumes a given consumable once, or several times with each of those consumptions naming callers in `by` that no other of them names; the ref of a repeated pair is the pair plus its first caller, so unnamed or shared callers leave two consumptions with one ref and only the first can be reached |
| `consumption-by-resolves` | error | a consumption's `by` names the consumer's own operations, or policies of the consumer's context; a consumption belongs to the consumer, so what makes it is the consumer's own |
| `process-in-context` | error | a process issues operations of its own bounded context; what starts it, what it waits for and what ends it may be another context's events |
| `process-has-ends` | warning | a process names at least one event that completes an instance |
| `process-starts` | error | a process names at least one event that begins an instance |
| `policy-in-context` | error | a policy issues operations of its own context; it may still react to another context's event |
| `aggregate-not-public` | error | an aggregate's operations declare no upstream role and are consumed only inside their own context |
| `aggregate-consumes-inside` | error | an aggregate consumes only consumables of its own bounded context; a foreign operation or event is consumed by an application service or a policy |
| `domain-service-internal` | error | a domain service's operations declare no upstream role and are consumed only inside their own context |
| `schema-context` | error | a schema named by a consumable's payload, by its `returns` or by a nested attribute belongs to the naming element's own context, to one it shares a kernel with, or to an upstream it has declared itself a `conformist` of |
| `returns-on-operation` | error | only an operation declares `returns`; an event has no caller to answer |
| `rejects-on-operation` | error | only an operation declares `rejects`; an event is a fact that already happened, so it has nothing left to refuse |
| `consumable-kind` | error | policies react to events and issue operations; only operations raise, and only events |
| `raises-in-context` | error | an operation raises only events its own bounded context provides; a context publishes its own facts |
| `raises-restated` | warning | an operation does not restate under `raises` an event an operation it calls through a consumption's `by` already raises; the chain carries it, and a copy can drift |
| `event-unraised` | warning | every event of a context we model is raised by one of that context's own operations |
| `policy-complete` | warning | a policy reacts to at least one event and issues at least one operation |
| `reaction-cycle` | warning | the reactions form no cycle: no operation raises an event whose policy issues an operation that leads back to it, following a consumption's `by` across a context boundary; a process fed by its own steps is a lifecycle rather than a ring, so a cycle is reported only when the walk returns to a reactor other than that one process |
| `context-serves-subdomain` | warning | every context serves a subdomain |
| `external-is-boundary` | error | an external context declares no aggregates, no policies, no processes and no invariants |
| `comments-required` | warning | every context relationship carries a comment; opt in with `options.rules.commentsRequired` |
| `disposition-needs-comment` | warning | an intent whose disposition is `tolerated` or `refactor` carries at least one comment |

The UI reports the counts when a workspace is loaded and lists the
diagnostics on the home page; the generated docs include them on the
workspace page.

```ts file=../../tests/validation.example.test.ts
```
