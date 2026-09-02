---
column: backlog
labels: [backend, breaking]
priority: med
updatedAt: 2026-09-02T12:00:00.000Z
---
# Use stable ids instead of name-based refs

Refs are string paths built from names (packages/core/src/schema.ts:160-200), so renaming any element breaks every ref to it. Consider stable ids with names as display labels, or at least a rename helper that rewrites refs.

## Checklist

- [ ] Record a decision on id strategy
- [ ] Implement with a migration in workspace-from-schema.ts
