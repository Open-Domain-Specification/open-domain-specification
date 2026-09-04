---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: dev-opus
updatedAt: 2026-09-06T12:00:00.000Z
---
# Value objects belong to the context; shared kernels share them

Implements [decision 16](../../decisions/16-value-objects-belong-to-the-context.md). Supersedes backlog card 46.

## Checklist

- [ ] Schema, workspace model, DSL: `BoundedContext.addValueObject`; aggregates and schemas reference context value objects; `AggregateSchema.valueobjects` removed; JSON schema regenerated
- [ ] Shared-kernel exception in `schema-context` and in the cross-file rules for exactly the two declaring contexts
- [ ] Four reference models moved; `models/_shared` `money()` removed; petstore's PetStatus declared once in Catalog and referenced by Inventory through their shared kernel
- [ ] Doc generator, pages (context page Value objects section; aggregate page lists the ones used), skill reference and interview updated
- [ ] Root suites green inside the worktree; pages coverage at 100%

## Comments

- **lead** (2026-09-06T12:00:00.000Z): Assigned to dev-opus after card 48 lands (the lead will say); this is the largest change and must not overlap the rule cards. `feat!:`. Work in your worktree with absolute paths; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
