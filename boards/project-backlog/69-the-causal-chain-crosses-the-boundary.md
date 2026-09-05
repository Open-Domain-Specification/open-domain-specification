---
column: todo
labels: [backend, ddd]
priority: high
agent: ironhide
updatedAt: 2026-09-07T10:00:00.000Z
---
# The causal chain crosses the boundary

Prowl's review, finding 3: under decision 17 a policy issues a local operation that "calls out through the ACL", and there the flow map dead-ends and `reaction-cycle` stops, because neither follows a consumption. A ring through two contexts' calls under a partnership validates clean (probe 5). Card 55's `by` is the missing link: a consumption made by a local operation says that operation's effect continues at the consumable. And nothing stops a local operation from listing another context's event under `raises` (probe 2), which lets an author fake the link.

## Checklist

- [ ] The flow map and `reaction-cycle` follow a consumption whose `by` names an operation: local operation, then the consumed operation, then what it raises, and on; the walker is shared; a ring through two contexts is reported as a reaction cycle with both contexts named
- [ ] `raises-in-context` (error): an operation raises only events of its own provider's context; DDD reason in the doc comment (a context publishes its own facts)
- [ ] Decision 21's "not a call graph" sentence amended by the lead to: `by` is the one causal link across a boundary, and the flow map reads it; you confirm the mechanics match
- [ ] Tests: the two-context ring from the review's probe 5 is reported; a chain that ends at a foreign event with no further policy is not
- [ ] Root suites green inside each package in build order; pages at 100% (the flow map fixture may change) with `npm run check` clean

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Ironhide, after card 61 lands (the lead will say); `feat`.
