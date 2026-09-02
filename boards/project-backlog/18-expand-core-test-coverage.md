---
column: backlog
labels: [backend, infra]
priority: med
updatedAt: 2026-09-02T12:00:00.000Z
---
# Expand core test coverage

Core has 39 test cases across four files, and workspace-from-schema.test.ts has a single case. Add round-trip, ref lookup and derived-map tests before the breaking schema work in cards 01, 02 and 05 lands.

## Checklist

- [ ] Round-trip toSchema/fromSchema equality on the petstore workspace
- [ ] Tests for context-map, consumable-map and relation-map derivations
- [ ] Negative tests for OrThrow lookups
