---
column: review
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Link invariants to the entities and attributes they constrain

Invariants are free text (packages/core/src/schema.ts:105-108). Allow an invariant to reference the entities, value objects or attributes it constrains so it can be rendered next to them and validated.

## Checklist

- [x] Add `constrains: { $ref }[]` to InvariantSchema
- [x] Render invariants on the entity they constrain

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T12:36:13.000Z): InvariantSchema.constrains holds refs to entities, value objects or attributes (packages/core/src/schema.ts:218-226). Invariant.constrains(...targets) and targets, a Constrainable union, constrainableLabel, and Workspace.getAttributeByRef / getConstrainableByRef which resolve an attribute through its owner (packages/core/src/workspace.ts:313-360,1160-1200). Loader links invariants after entity and value object attributes exist (packages/core/src/workspace-from-schema.ts:277-290). UI shows Constrains badges via apps/ods-ui/src/components/ConstrainsBadges.tsx; docs add a Constrains column. Petstore invariants point at Pet.name, PetStatus, Quantity and OrderStatus. Build and 114 tests green. Six-agent audit: nothing above 0.5; the label helper flagged as duplicated by three agents now lives in core.
