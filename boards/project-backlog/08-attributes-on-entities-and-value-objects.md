---
column: done
labels: [ddd, backend]
priority: high
updatedAt: 2026-09-03T13:20:00.000Z
live: false
---
# Add attributes to entities and value objects

Entities and value objects have only a name, description and relations (packages/core/src/schema.ts:80-85 and 140-144). Value objects in particular are defined by their attributes. Add a typed attribute list with name, type, description and optional identity marker.

## Checklist

- [x] Add AttributeSchema and addAttribute on Entity and ValueObject
- [x] Allow an attribute type to reference a value object
- [x] Render attribute tables in doc and UI

## Gates

- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T12:32:18.000Z): Per decisions/05: EntitySchema.attributes and ValueObjectSchema.attributes reuse AttributeSchema from card 03 (packages/core/src/schema.ts:120-150); Entity and ValueObject implement AttributeOwner with addAttribute (packages/core/src/workspace.ts:930-960,1030-1060); loader links their attributes, including value object refs, in the second pass (packages/core/src/workspace-from-schema.ts:252-275). UI shows an AttributeList under each entity and value object; docs add an Attributes column with identity attributes in bold. Petstore Pet, Order and User roots and their value objects now carry typed attributes. Build and 111 tests green. Six-agent audit: no findings above 0.3.
