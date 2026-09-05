---
column: todo
labels: [backend, ddd, breaking, pages]
priority: high
agent: ironhide
updatedAt: 2026-09-07T10:00:00.000Z
---
# A context has invariants across instances

Implements [decision 27](../../decisions/27-a-context-has-invariants-across-instances.md): `BoundedContextSchema.invariants`, two rules, the eleven cross-instance invariants of the reference models move to their contexts and name their guards, and the aggregate invariant's rule text finally says what it means.

## Checklist

- [ ] `invariants` on `BoundedContextSchema`; workspace model (`Invariant.owner` is an aggregate or a context), DSL `bc.addInvariant`, `toSchema`/`fromSchema`, JSON schema regenerated; refs in the grammar
- [ ] `invariant-in-context` and `context-invariant-guarded` (errors) with DDD reasons; `invariant-in-aggregate`'s summary, why and fix rewritten to "holds inside the boundary on every save"; its fix text no longer says "model the guarantee as a policy"
- [ ] Reference models: every invariant whose prose says one instance cannot see another (StreamLine `OneActiveSubscriptionPerHousehold`, `WithinStreamLimit`; NorthBank `DailyLimit`, `OneOpenApplicationPerCustomer`; RiverMart `OneActiveOfferPerSellerSku`; and the rest the sweep finds) moves to its context and names its guard; DISCOVERY.md sections that said "ODS has no other place" updated; `.ods/` and petstore `docs/` regenerated
- [ ] Pages: context page Invariants section in the aggregate page's shape; invariant page states its kind and owner; tree and search in the extension; doc generator prints all of it
- [ ] Skill: DSL reference, interview question "is this true of one of these, or of all of them together?", regenerated bundle
- [ ] Decision 15's "a rule that spans aggregates is not an invariant" section replaced by a pointer to decision 27 (the lead writes it; you confirm the pointer resolves)
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean; `cmp` of the petstore schema against core dist silent

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Ironhide, after card 67 lands (the lead will say); `feat!`.
