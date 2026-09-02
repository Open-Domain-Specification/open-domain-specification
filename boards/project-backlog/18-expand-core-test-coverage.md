---
column: review
labels: [backend, infra]
priority: med
updatedAt: 2026-09-02T11:43:34.000Z
live: false
---
# Expand core test coverage

Core has 39 test cases across four files, and workspace-from-schema.test.ts has a single case. Add round-trip, ref lookup and derived-map tests before the breaking schema work in cards 01, 02 and 05 lands.

## Checklist

- [x] Round-trip toSchema/fromSchema equality on the petstore workspace
- [x] Tests for context-map, consumable-map and relation-map derivations
- [x] Negative tests for OrThrow lookups

## Comments

- **claude** (2026-09-02T11:43:34.000Z): Added makeRichTestWs in packages/core/src/makeTestWs.ts:118-224 with distinct descriptions, a root entity, cross-aggregate relations, an aggregate event and consumptions. New tests: packages/core/src/round-trip.test.ts:1-56, packages/core/src/lookups.test.ts:1-77, packages/core/src/derived-maps.test.ts:1-101, plus a petstore JSON round-trip in packages/ods-example-ws/src/workspace.test.ts:244-251. The round-trip immediately exposed a real bug: fromSchema passed the domain's attributes to every subdomain, so all subdomain descriptions were overwritten by the parent domain's. Fixed at packages/core/src/workspace-from-schema.ts:43-46. Core now 59 tests, example 14. Full six-agent clean-code audit: nothing above 0.5; fixed a 0.4 shared-fixture mutation in lookups.test.ts.
