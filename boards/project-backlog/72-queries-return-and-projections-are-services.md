---
column: todo
labels: [models, ddd]
priority: medium
agent: bumblebee
updatedAt: 2026-09-07T10:00:00.000Z
---
# Queries declare what they return; projections are query services

Prowl's review, findings 7 and 12. Decision 13 exists because a query promised data it could not show; the four models declare `returns` six times in total and leave a dozen queries (`GetEntitlement`, `GetAvailableBalance`, `GetOrder`, `SearchProducts`, `FindPetsByStatus` and the rest) returning nothing, including the two that invariants read. Decision 15 says read models are query services; three models model them as aggregates with invented roots (`InventoryProjection`, `SearchIndex`, `InventoryView`) and petstore's discovery notes admit "ODS has no projection element". The models follow their own decisions.

## Checklist

- [ ] Every query operation in the four models declares `returns` with a schema that says what comes back; a command that returns something worth naming does too
- [ ] `InventoryProjection`, `SearchIndex`, `InventoryView` and any other projection modelled as an aggregate become a query service whose operations return the projection's shape as a schema; the policies that fed the projection now issue the service's update operation; DISCOVERY.md sections updated
- [ ] `.ods/` regenerated for changed models, petstore `docs/` regenerated; each model builds with only its `deliberate` diagnostics; pages fixture tests green
- [ ] The skill's interview asks "what does it answer with?" for every query and the translation table's read-model row says "query service" with an example

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Bumblebee, after card 63 lands (the lead will say); models and skill only, no core change.
