---
column: backlog
labels: [ddd, backend]
priority: high
updatedAt: 2026-09-02T12:00:00.000Z
---
# Add domain events as first-class objects

Events exist only as `type: "event"` on a Consumable (packages/core/src/schema.ts:31-42). They carry no payload, cannot be internal to a context, and are not tied to the aggregate state change that raises them. Add a DomainEvent building block on aggregates with optional attributes, and let consumables reference events rather than duplicate them.

## Checklist

- [ ] Add DomainEventSchema and Aggregate.addEvent
- [ ] Allow a Consumable of type event to reference a DomainEvent
- [ ] Render events on the aggregate page and in the doc generator
- [ ] Tests in packages/core/src/workspace.test.ts
