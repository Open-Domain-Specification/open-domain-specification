---
column: todo
labels: [backend, ddd]
priority: medium
agent: ironhide
updatedAt: 2026-09-07T10:00:00.000Z
---
# An aggregate does not call out of its context

Prowl's review, finding 8: decision 17 routes inbound operations through an application service but lets an aggregate consume another context's operation (probe 4), so StreamLine's session aggregate and NorthBank's card and request aggregates do synchronous I/O while petstore and RiverMart put the same calls on services. The same fact reads two ways. An aggregate is a consistency boundary, not a client; its context's application service calls out and hands the aggregate what it needs.

## Checklist

- [ ] `aggregate-consumes-inside` (error): an aggregate consumes only consumables of its own context (its own aggregates' and services' operations, and events of its own context); a foreign operation or event is consumed by an application service or a policy; DDD reason in the doc comment
- [ ] Reference models: StreamLine's and NorthBank's outbound calls on aggregates move to the application service that owns the use case, with `by` naming the operation where it plainly differs; `.ods/` regenerated
- [ ] Decision 17 amended by the lead with the outbound half; you confirm the rule matches
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Ironhide, after card 71 lands (the lead will say); `feat`.
