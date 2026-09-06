---
status: Accepted
date: 2026-09-06
---
# Decision 16 — Value objects belong to the bounded context, and a shared kernel shares them

## Current position (2026-09-10)

Value objects belong to the bounded context and no workspace-level value objects or schemas exist; stable. The borrowing rule has widened: a value object or schema crosses to a shared-kernel partner (the decision) or, downstream only, from a conformed-to upstream (amendment of 2026-09-08, card 81), and `valueobject-context` (third amendment of 2026-09-08, card 92) now enforces on `attribute.valueobject` what the decision claimed and nothing checked. A borrowed value object is drawn on the relation map with its context named (card 93), and a local value-object attribute derives its own line without a restated `uses` relation (note of 2026-09-10, card 104).

The kernel-as-context reading is a convenience for many sharers, not a rule: two contexts sharing a kernel borrow directly, and the kernel context exists for many sharers or for an entity both teams own (note of 2026-09-10, card 120, reading the amendment of 2026-09-07). A kernel context's aggregate operations may be consumed by its sharers, which `shared-kernel-backed` counts (amendments of 2026-09-08 second, card 90, and 2026-09-09 second, card 98; the latter corrected the note that contradicted `aggregate-not-public`). A kernel context is exempt from `context-serves-subdomain` when all its relationships are shared-kernel with two or more sharers (2026-09-09, card 95). The kernel's `team` is its keeper; co-owners are not listed, a named cost.

No aggregate-private value objects (note of 2026-09-07); an entity has one home, now listed as a preference in decision 15. An external context's value objects may carry a standard's invariants (decision 28, card 91).

## Context

`ValueObjectSchema` lives under an aggregate (`schema.ts:34`), so a value object used by several aggregates of one context, NorthBank's `Money` or petstore's `PetStatus`, is declared once per aggregate, and `models/_shared/src/index.ts` exists only to repeat the declaration. In DDD a value object is part of the context's ubiquitous language, not an aggregate's. Separately, `shared-kernel` is a relationship type the map draws but no rule reads: two contexts declaring it still cannot reference one another's value objects or schemas (`schema-context`, decision 08's cross-file table). The relationship claims a sharing the model forbids.

## Decision

- Value objects move to the bounded context: `BoundedContextSchema.valueobjects`. An aggregate's entities and value objects reference them by `$ref` exactly as attributes reference them today; `AggregateSchema.valueobjects` is removed.
- A `shared-kernel` relationship between two contexts permits `AttributeSchema.valueobject` and `ConsumableSchema.schema`/`returns` references across those two contexts only. The `schema-context` rule and decision 08's cross-file rule both make that exception, and no other. Every other pair of contexts stays sealed.
- No `SharedKernel` namespace, no workspace-level value objects or schemas (decision 09 stands).

## Consequences

- Breaking `feat!`: schema, workspace model, DSL (`context.addValueObject`), JSON schema, all four reference models, `models/_shared` loses `money()`, doc generator (a Value objects section on the context page, referenced from aggregates), pages (context page gains the section; aggregate page lists the ones it uses), skill reference and interview ("which values does this context define once?").
- A shared kernel finally means something structural, and the health report can show what crosses it.

## Amendment (2026-09-07)

A shared kernel among many contexts is not many pairs. The kernel is a context of its own, owning the value objects and schemas it shares, and every context that uses the shared library declares one `shared-kernel` relationship with it and borrows what it needs. Six contexts sharing a financial-primitives library are six relationships to one kernel context, not fifteen among themselves, and `shared-kernel-backed` is satisfied on each by the borrowing it names. Card 56 makes NorthBank show this instead of declaring its Money once per context.

## Note (2026-09-07)

Reviewers ask for aggregate-private value objects, for two reasons: an aggregate's internal calculation structures have no meaning outside it, and two aggregates in one context may want the same name for different values. The first is not a value object of the model; an intermediate that nobody else names is an implementation detail and stays in code. The second is the ubiquitous language's own rule: one term has one meaning inside a bounded context, and two meanings for one name are the sign that a context boundary runs between the two aggregates. The model keeps value objects on the context for exactly that reason.

## Amendment (2026-09-08)

A shared kernel is co-owned. Where one team owns the library and others merely use it, the relationship is directed: the owner is upstream with a published language, and each user is a downstream conformist, which decision 03's conformist role now lets borrow the upstream's schemas and value objects in that one direction (card 81). NorthBank's kernel is co-owned by a kernel team and stays a shared kernel; a model whose primitives belong to one team declares the directed form instead.

## Note (2026-09-08)

Evans's shared kernel is a bounded subset of model and code two teams own together, not only primitives. The model holds it the same way in both sizes: two contexts share value objects and schemas directly, and anything with identity and behaviour that two teams own together, a jointly maintained Product with its unit conversions, is an aggregate of a kernel context that both consume through its operations. Nothing is duplicated and the agreement is the kernel context's own model. A shared entity outside a kernel context is not expressible, on purpose: an entity has one home.

## Amendment (2026-09-08, second)

A kernel context's aggregate is shared by being consumed: `shared-kernel-backed` counts a sharer's consumption of the kernel's operations as well as its borrowed value objects and schemas (card 90). The kernel's `team` is the team that keeps it, which for a co-owned kernel is the joint team the model names; the model does not list the co-owners, and that is a named cost.

## Amendment (2026-09-08, third)

This record promised the boundary was sealed for value objects and the validator never checked `attribute.valueobject` across contexts; the architect's third review found a claim held on the specification's central rule with nothing under it. `valueobject-context` (card 92) refuses a borrowed value object unless a shared kernel or a conformist relationship carries it, with the same predicate `schema-context` uses, and `relationship-declared` counts the borrowing as a crossing. A borrowed value object is not drawn on the relation map today; card 93 draws it with its context named.

## Amendment (2026-09-09)

A shared kernel context serves its sharers' subdomains, not one of its own; `context-serves-subdomain` exempts a context whose relationships are all shared-kernel with two or more sharers (card 95). NorthBank's invented "Shared Financial Primitives" subdomain, which decision 28 named as a bend, comes out. The kernel-as-context reading remains a named cost: Evans's kernel is code both teams run inside their own contexts, and the model draws it as a third context both consume, which loses the pairwise fact and gains an honest owner.

## Amendment (2026-09-09, second)

The note saying a kernel's aggregate is consumed through its operations contradicted `aggregate-not-public`, which refused exactly that. A kernel context's aggregate operations may be consumed by the contexts that share the kernel, because the kernel is shared code and its aggregates are the sharers' own (card 98); for any other context the aggregate stays internal.

## Note (2026-09-10)

A local value-object attribute no longer has to be restated as a `uses` relation: the line is derived from the attribute, as it is for a borrowed one, and a declared relation only adds a label or a cardinality (card 104). The reference models had written the pair hundreds of times and no decision had named that cost.

## Note (2026-09-10)

Reviewers heard "a shared kernel is a third context" and this record had folded a convenience into a rule. Two contexts sharing a kernel borrow each other's value objects and schemas directly; that pairwise kernel is Evans's shared subset, modelled as such. The kernel context is for many sharers, and for the one thing a pairwise kernel cannot hold: an entity both teams own, which is an aggregate of a kernel context both consume, because a relation or a kind never crosses a context and an entity has one home. That last clause is a preference, now listed in decision 15; the refusing rules point at the route (card 120).
