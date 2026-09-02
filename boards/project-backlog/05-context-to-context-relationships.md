---
column: backlog
labels: [ddd, backend, breaking]
priority: high
updatedAt: 2026-09-02T12:00:00.000Z
---
# Model context relationships explicitly instead of per-consumable patterns

Relationship patterns are split across ConsumablePattern and ConsumptionPattern (packages/core/src/schema.ts:25-58). customer-supplier appears on both sides, partnership and shared-kernel are symmetric context relationships rather than properties of one consumable, and separate-ways means no integration so it makes no sense on a consumption. Add an explicit BoundedContext-to-BoundedContext relationship carrying upstream/downstream direction and pattern; derive the context map in packages/core/src/context-map.ts from it.

## Checklist

- [ ] Design ContextRelationshipSchema (upstream, downstream, pattern, optional symmetric flag)
- [ ] Decide which patterns stay on consumables (OHS, PL) and which move to relationships
- [ ] Rebuild ODSContextMap from relationships plus consumptions
- [ ] Migration in workspace-from-schema.ts
- [ ] Record a decision in decisions/
