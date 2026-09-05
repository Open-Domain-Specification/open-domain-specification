---
column: todo
labels: [backend, ddd]
priority: high
agent: ironhide
updatedAt: 2026-09-07T10:00:00.000Z
---
# Every crossing has a declared relationship, and no two relationships collide

Prowl's review, findings 4, 6 and 10. Decision 03 made relationships explicit and decision 08 promised a rule that a consumption of another context needs a matching relationship; no such rule exists, the context map just draws an implied edge (probe 3). An `identifies` into another context draws nothing on any map and needs no relationship (NorthBank's Fraud case identifies a customer with no Fraud/Customer relationship). And two relationships of one type in one direction between a pair share a ref and the second is unreachable (probe 6).

## Checklist

- [ ] `relationship-declared` (warning): a consumption across contexts, or an `identifies` across contexts, with no relationship joining the two contexts in the right direction (a symmetric relationship counts either way); fix text names the two contexts; the implied edge on the context map stays as the visual hint
- [ ] The context map draws an identity-only dependency as an implied edge like a consumption's, with its own legend row; decision 14's sentence "reads on the consumable map" corrected by the lead to the context map
- [ ] `relationship-duplicate` (error): two relationships of the same type and direction between one pair; fix text says roles go on one relationship
- [ ] RiverMart's role-less relationship invented to record an identity dependency re-read: keep it with roles if the dependency is real, or let `relationship-declared` and the implied edge carry it
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Ironhide, after card 69 lands (the lead will say); `feat`. Decision 08 is marked Proposed by the lead and its table corrected; do not touch it.
