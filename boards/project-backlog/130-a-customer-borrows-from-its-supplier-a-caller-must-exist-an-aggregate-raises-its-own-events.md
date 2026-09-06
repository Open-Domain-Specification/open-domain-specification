---
column: todo
labels: [backend, docs]
priority: high
agent: senior-developer
live: true
updatedAt: 2026-09-11T03:20:00.000Z
---
# A customer borrows from its supplier; a caller must exist; an aggregate raises its own events; a refusal may be a list

The architect's fourteenth round found two defects and one gap the model's own reasoning says to close. Decision 03's amendment stopped asking a customer-supplier downstream for a role, and `mayBorrowFrom` still licenses a borrowed value object or schema only over a shared kernel or a declared conformist role, so a customer that types an attribute by the supplier's value object is refused and told to call itself a conformist. A node that provides no operation may consume a foreign operation and nothing asks who calls it: `consumption-by-required` skips consumers with fewer than two operations and the single-operation inference has nothing to infer from, so the walk dead-ends silently. An aggregate's operation may raise another aggregate's event in the same context, the two-transaction act `aggregate-consumes-inside` refuses as a call, because `raises-in-context` reads the context only; and `raises-restated`'s `raisersAmong` filters on a written `by` without the single-operation inference, printing an empty name. Two smaller things: `rejects` has no `many` though decision 13's argument applies to a refusal that is a root array; and a partner pair that shares a shape hits an error whose fix text does not say the answer is a shared kernel beside the partnership. Decisions 13, 16, 17 and 21 are amended.

## Checklist

- [ ] `mayBorrowFrom` licenses a downstream of a `customer-supplier` relationship to borrow the supplier's value objects and schemas, as a conformist may; `valueobject-context` and `schema-context` fix text names the three routes (kernel, conformist, customer-supplier) and, for partners, a shared kernel beside the partnership; tests for the customer that types by the supplier's value and answers with its schema, and for the partner pair
- [ ] `consumption-by-required` reports an operation consumption on a consumer that provides no operation (external and mud consumers exempt), with fix text that says to add the operation that makes the call; test for the subscribe-only application service
- [ ] `raises-in-aggregate` (error): an aggregate's operation raises only its own aggregate's events; an application service's operation may raise any aggregate's event of its context (decision 17); message and fix text; test; `raises-restated`'s `raisersAmong` applies the single-operation inference so the message names the raiser
- [ ] `rejects` entries may carry `many`, mirroring `returns`; the DSL, loader, `toSchema`, JSON schema, pages and doc that print a rejection follow; test and round trip
- [ ] `apps/docs/docs/3-core/4-validation.md` rows for the rules touched; skill references regenerated; every model's diagnostics unchanged; `bash scripts/verify-all.sh` green

## Comments
