---
column: todo
labels: [backend, ddd, breaking]
priority: medium
agent: ironhide
updatedAt: 2026-09-07T02:10:00.000Z
---
# A consumption names the operations that make it

The sixth review run (issue 6) is right that a consumption declared on a service says every operation of that service depends on the consumable, when usually one or two do. StreamLine's subscription service consumes a payment gateway; listing entitlements does not. The atlas view is unchanged, the consumer node still depends on the provider, but the evidence beneath it should be able to say which of the consumer's own operations or policies make the exchange.

`ConsumptionSchema.by?: Array<{ $ref: string }>`: the consumer's own consumables (operations) or policies that make this exchange. Absent means the whole consumer, which stays the default and the common case. This is optional detail, not a call graph; nothing derives sequence diagrams from it. The seventh review run (issue 4) asks for the same link from the other side, which provided operation invokes which consumption, and `by` answers it.

## Checklist

- [ ] `by?: Array<{ $ref }>` on `ConsumptionSchema`; workspace model, DSL (`consumes(consumable, { by: [...] })`), `toSchema`/`fromSchema`, JSON schema regenerated
- [ ] `consumption-by-resolves` (error): every `by` ref resolves to a consumable or policy of the consumer node itself, not of another node or context
- [ ] Reference models: StreamLine's subscription service names the operations behind its payment gateway consumption; petstore names one; the core fixture `makeTestWs.ts` carries one, so the pages fixture shows it
- [ ] Consumable page and context page list, under each consumption, the operations that make it; the consumable map's edge hover shows them; doc generator prints them; skill reference and interview ("which operations of this service actually make that call?")
- [ ] Decision 21 written: a consumption belongs to the consumer and may name the operations behind it
- [ ] Root suites green inside the worktree; pages at 100%

## Comments

- **optimus-prime** (2026-09-07T02:10:00.000Z): Ironhide, after card 54 lands (the lead will say); schema changes are serialised. `feat!:`. Work in your worktree with absolute paths; `git reset --hard origin/develop` there first.
