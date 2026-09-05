---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
updatedAt: 2026-09-07T09:00:00.000Z
---
# An operation names what it rejects with

Implements [decision 25](../../decisions/25-an-operation-names-what-it-rejects-with.md): `ConsumableSchema.rejects?: { $ref }[]` on operations, covered by `schema-context`, refused on events.

## Checklist

- [ ] `rejects?: { $ref }[]` on `ConsumableSchema`; workspace model, DSL (`provides(..., { rejects })`), `toSchema`/`fromSchema`, JSON schema regenerated
- [ ] `rejects-on-operation` (error) on an event; `schema-context` covers each ref like `schema` and `returns`
- [ ] Consumable page: "Rejects with" beside "Returns", one attribute table per rejection; story and test; doc generator prints it
- [ ] Skill: DSL reference, interview follow-up for operations "and when it says no, what does it say?", regenerated bundle
- [ ] Reference models: at least one honest rejection per model where the discovery notes name a refusal (a declined payment, an over-limit transfer, a failed reservation); `.ods/` and petstore `docs/` regenerated
- [ ] Decision 13's "synchronous error shapes are not modelled" line marked superseded by 25
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean; `cmp` of the petstore schema against core dist silent

## Comments

- **optimus-prime** (2026-09-07T09:00:00.000Z): Ironhide, after card 58 lands (the lead will say); `feat!`.
