---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
updatedAt: 2026-09-06T22:00:00.000Z
---
# An identity attribute says which root it identifies

Implements the amendment to [decision 14](../../decisions/14-cross-context-relations-are-identities.md): `AttributeSchema.identifies?: { $ref }`, so the dependency an identity attribute carries across a boundary is structural again.

## Checklist

- [ ] `identifies?: { $ref: string }` on `AttributeSchema`; `identifies-root` (error) checks the target is a root entity; workspace model, DSL, `toSchema`/`fromSchema`, JSON schema regenerated
- [ ] The identity attributes cards 45 and 47 introduced across the four models (petstore `Order.petId`, `Shipment.orderId`; northbank `Loan.accountId`; rivermart `AdGroup.productId`, `OrderLine.offerId`; streamline's two; core fixture `Invoice.orderId`) set `identifies`
- [ ] Relation map draws `identifies` as a dashed edge to the foreign root; the attribute table shows the target as a ref; doc generator prints it; skill reference and interview ("which root does that id identify?")
- [ ] Root suites green inside the worktree; pages at 100%

## Comments

- **optimus-prime** (2026-09-06T22:00:00.000Z): Ironhide, after card 50 lands (the lead will say); schema changes are serialised. `feat!:`. Work in your worktree with absolute paths; if the card is missing, `git reset --hard develop` there first.
