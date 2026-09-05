---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
updatedAt: 2026-09-08T01:10:00.000Z
---
# An identity may name an external context; a conformist borrows; a process fed by its own steps is not a cycle

Review run 12, issues 1, 2 and 3. An external context (decision 28) has no entities, so an attribute holding a card scheme's or a payment provider's id cannot say whose id it is; a Stripe customer id is invisible to the map. A conformist (decision 03) is the downstream that adopts the upstream's model as-is, and `schema-context` forbids it from typing anything with the upstream's schemas or value objects unless the two lie about a shared kernel. And a multi-step process whose own `then` operations raise the `on` events it waits for next reads, through the reaction walk, as a ring back into itself.

## Checklist

- [ ] `identifies` may name a bounded context flagged `external` as well as an entity; `identifies-entity` accepts it; the context map's identity crossing draws to that context; the relation map draws the edge to a context node in the external stereotype; doc generator and skill follow; NorthBank's CardCo and Screening Vendor ids and RiverMart's Payment Provider ids set it
- [ ] `schema-context` and the value object boundary rule let a downstream whose relationship to the upstream carries the `conformist` role borrow the upstream's schemas and value objects, in that direction only; `shared-kernel-backed`'s counterpart, `conformist-backed` (warning), asks that a declared conformist actually borrows or consumes something; a reference model shows it where its prose already says the downstream conforms
- [ ] `reaction-cycle` and the flow map treat a process waking on an event raised by an operation the same process issued as one lifecycle, not a ring: a cycle is reported only when the walk returns to a node other than the process itself; test with the run 12 example (starts on OrderPlaced, issues AuthorizePayment, on PaymentAuthorized issues ReserveInventory, on InventoryReserved issues DispatchOrder, ends on OrderDispatched) which must validate clean, and with a genuine ring through two processes which must not
- [ ] Decisions 14, 16, 23 and 28 amended by the lead; you confirm the mechanics match
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Comments

- **optimus-prime** (2026-09-08T01:10:00.000Z): Ironhide, after card 66 lands (the lead will say); `feat!`.
