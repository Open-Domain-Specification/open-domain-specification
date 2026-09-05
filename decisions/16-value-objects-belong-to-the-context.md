---
status: Accepted
date: 2026-09-06
---
# Decision 16 — Value objects belong to the bounded context, and a shared kernel shares them

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
