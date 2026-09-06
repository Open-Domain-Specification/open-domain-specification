---
column: todo
labels: [backend, docs]
priority: low
agent: developer
updatedAt: 2026-09-10T05:30:00.000Z
---
# The remaining required keys go optional; the rules table and the JSON-mode note catch up

Card 104 made most collections optional in the JSON schema and left `consumes` on aggregates and services and `attributes` and `invariants` on value objects required, so a hand-written aggregate still writes an empty list. Six rows of the hand-written rules table describe the rules as they were before cards 103 and 104, and the skill's JSON-mode reference still says a dangling ref fails the whole file, which card 100 made untrue. A reactor naming one trigger in both `on` and `ends` gets the same `consumable-kind` diagnostic twice.

## Checklist

- [ ] `consumes` on `AggregateSchema` and `ServiceSchema`, and `attributes` and `invariants` on `ValueObjectSchema`, optional and empty by default on load; JSON schema regenerated; `toSchema` still writes what it has
- [ ] `apps/docs/docs/3-core/4-validation.md` rows for `relationship-cycle`, `relationship-declared`, `separate-ways`, `attribute-relation-coherence`, `context-invariant-is-checked`, `mud-needs-acl` and any other row the drift test cannot see say what the rules do now; the row test that pins ids stays
- [ ] `packages/skill/skill/references/json-mode.md` says a dangling ref becomes an `unresolved-ref` diagnostic and the rest of the file still validates
- [ ] `consumable-kind` reports a trigger once when it appears in both `on` and `ends`
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **the lead** (2026-09-10T05:30:00.000Z): developer, now; `fix`.
