---
column: backlog
labels: [ddd, backend]
priority: high
updatedAt: 2026-09-02T12:00:00.000Z
---
# Add attributes to entities and value objects

Entities and value objects have only a name, description and relations (packages/core/src/schema.ts:80-85 and 140-144). Value objects in particular are defined by their attributes. Add a typed attribute list with name, type, description and optional identity marker.

## Checklist

- [ ] Add AttributeSchema and addAttribute on Entity and ValueObject
- [ ] Allow an attribute type to reference a value object
- [ ] Render attribute tables in doc and UI
