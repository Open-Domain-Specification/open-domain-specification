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
| `cross-aggregate-reference` | error | relations into another aggregate are `references` to its root; a relation to a value object crosses no aggregate, since the context declares it |
| `cross-context-relation` | error | a relation never crosses a bounded context; the source holds the other root's identity instead |
| `root-identity` | error | an aggregate's root entity declares at least one identity attribute |
| `entity-identity` | warning | every other entity in an aggregate declares at least one identity attribute; without one it is a value object |
| `value-object-shape` | error | a value object declares no identity attribute and includes nothing |
| `aggregate-tree` | error / warning | inside an aggregate `includes` forms a tree from the root over entities, `uses` points at value objects, and every entity is reachable from the root |
| `attribute-relation-coherence` | warning | an attribute typed by a value object has the matching `uses` relation, of a matching cardinality; the type itself is free text and is never checked against the value object's name |
| `invariant-in-aggregate` | error | every element an invariant constrains is inside the invariant's own aggregate, or is a value object of its context |
| `relationship-roles-backed` | warning | a directed relationship's declared roles are carried by real crossings, and a crossing consumption's role is declared on the relationship; a crossing consumable's `schema` backs a `published-language` role |
| `relationship-cycle` | warning | the directed relationships whose traffic is calls form no cycle; a step carried only by events is choreography and does not count (decision 20). The message lists the ring's contexts in order |
| `shared-kernel-backed` | warning | two contexts declaring a shared kernel share at least one value object or schema across it |
| `partnership-backed` | warning | two contexts declaring a partnership exchange consumables, or events a policy reacts to, in both directions |
| `mud-needs-acl` | warning | a consumption from a big ball of mud is translated behind an anti-corruption layer |
| `term-in-context` | error | a glossary term's `embodiedBy` names an element of the term's own context |
| `role-coherence` | warning | consumables and consumptions crossing contexts declare their roles, unless the two contexts are partners or share a kernel |
| `separate-ways` | error | contexts that declared separate ways exchange no consumables, and neither reacts to the other's events |
| `internal-consumable` | error | an internal consumable is not consumed, reacted to or issued from another context |
| `policy-in-context` | error | a policy issues operations of its own context; it may still react to another context's event |
| `aggregate-not-public` | error | an aggregate's operations declare no upstream role and are consumed only inside their own context |
| `domain-service-internal` | error | a domain service's operations declare no upstream role and are consumed only inside their own context |
| `schema-context` | error | a consumable's sent and returned payload schemas belong to its own context, or to one it shares a kernel with |
| `returns-on-operation` | error | only an operation declares `returns`; an event has no caller to answer |
| `consumable-kind` | error | policies react to events and issue operations; only operations raise, and only events |
| `policy-complete` | warning | a policy reacts to at least one event and issues at least one operation |
| `reaction-cycle` | warning | the reactions form no cycle: no operation raises an event whose policy issues an operation that leads back to it |
| `context-serves-subdomain` | warning | every context serves a subdomain |
| `comments-required` | warning | every context relationship carries a comment; opt in with `options.rules.commentsRequired` |
| `disposition-needs-comment` | warning | an intent whose disposition is `tolerated` or `refactor` carries at least one comment |

The UI reports the counts when a workspace is loaded and lists the
diagnostics on the home page; the generated docs include them on the
workspace page.

```ts file=../../tests/validation.example.test.ts
```
