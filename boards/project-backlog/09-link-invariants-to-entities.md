---
column: backlog
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-02T12:00:00.000Z
---
# Link invariants to the entities and attributes they constrain

Invariants are free text (packages/core/src/schema.ts:105-108). Allow an invariant to reference the entities, value objects or attributes it constrains so it can be rendered next to them and validated.

## Checklist

- [ ] Add `constrains: { $ref }[]` to InvariantSchema
- [ ] Render invariants on the entity they constrain
