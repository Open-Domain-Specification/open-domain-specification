---
column: review
labels: [ddd, backend]
priority: high
updatedAt: 2026-09-03T13:05:00.000Z
live: false
---
# Add domain events as first-class objects

Events exist only as `type: "event"` on a Consumable (packages/core/src/schema.ts:31-42). They carry no payload, cannot be internal to a context, and are not tied to the aggregate state change that raises them. Add a DomainEvent building block on aggregates with optional attributes, and let consumables reference events rather than duplicate them.

## Checklist

- [x] Add DomainEventSchema and Aggregate.addEvent
- [x] Allow a Consumable of type event to reference a DomainEvent
- [x] Render events on the aggregate page and in the doc generator
- [x] Tests in packages/core/src/workspace.test.ts

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T12:24:54.000Z): Per decisions/04 and 05: AttributeSchema and DomainEventSchema added, AggregateSchema.events, ConsumableSchema.event ref and eventRef helper (packages/core/src/schema.ts:60-100,215-230,330-345). Model: Attribute and DomainEvent classes with an AttributeOwner interface, Aggregate.addEvent and Aggregate.publishes which creates the event consumable linked to the domain event (packages/core/src/workspace.ts:770-810,1340-1450). Loader adds consumables and attributes in the second pass so refs resolve (packages/core/src/workspace-from-schema.ts:24-75,190-240). Visitor gains visitDomainEvent. UI: Events accordion with an AttributeList on the aggregate page and spotlight entries; docs: Events table via packages/doc/src/attributes.md.ts. Petstore defines every event with addEvent and publishes it; PetRegistered, PetStatusChanged and OrderPlaced carry typed attributes. Build and 108 tests green. Six-agent audit: nothing above 0.5; removed unused isEventRef, folded four aggregate-member lookups into findAggregateMember, loader now uses addAttribute through the ref lookup, renamed AttributeOptions and the example's published-consumable variables.
