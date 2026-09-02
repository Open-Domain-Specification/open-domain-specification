---
column: backlog
labels: [ddd, backend]
priority: med
updatedAt: 2026-09-02T12:00:00.000Z
---
# Add cardinality and cross-aggregate reference rules to entity relations

Entity relations are typed only as references | includes | uses with no cardinality (packages/core/src/schema.ts:87-99). Add cardinality, and enforce the DDD rule that a cross-aggregate reference may only target another aggregate's root entity by identity.

## Checklist

- [ ] Add `cardinality` to EntityRelationSchema
- [ ] Validate that `references` across aggregates targets a root entity
