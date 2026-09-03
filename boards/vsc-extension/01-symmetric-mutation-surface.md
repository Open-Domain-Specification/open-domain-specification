---
column: todo
labels: [backend, ddd]
priority: high
updatedAt: 2026-09-02T14:00:00.000Z
live: false
---
# Symmetric mutation surface on the workspace model

The model in packages/core/src/workspace.ts has 43 add methods and no remove, rename or update methods. The VS Code extension holds a Workspace in memory as the single mutation path, so every element type needs the inverse of its add method, and updates for its scalar attributes, so the extension never has to touch the JSON directly.

## Checklist

- [ ] remove methods on every container: Workspace (domain, boundedcontext, relationship, team), Domain (subdomain), BoundedContext (service, aggregate, policy, term, subdomain link), Service and Aggregate (consumable, consumption), Aggregate (entity, valueobject, invariant), BoundedContext (schema), Entity, ValueObject and DataSchema (attribute), Entity and ValueObject (relation), Consumable (raises), Team (ownership)
- [ ] Removal cleans up references: consumptions of a removed consumable, raises and policy links to a removed consumable, relations targeting a removed entity or value object, invariants constraining a removed element, schema links on consumables of a removed schema, team ownership of a removed context, valueobject links on attributes
- [ ] update methods for scalar attributes (name, description, type, cardinality, and the rest) that keep the id stable per the card 15 rules
- [ ] rename by id as an explicit operation that rewrites every ref pointing at the element
- [ ] Tests: each remove leaves toSchema output that reloads with fromSchema and validates without reference errors; property test that add then remove returns to the prior schema
- [ ] Docs page in apps/docs/docs/3-core covering the mutation API
