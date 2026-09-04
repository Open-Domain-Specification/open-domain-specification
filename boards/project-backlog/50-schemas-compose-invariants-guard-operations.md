---
column: todo
labels: [backend, ddd]
priority: med
agent: dev-opus
updatedAt: 2026-09-06T12:00:00.000Z
---
# Schemas compose; invariants may constrain operations

Implements [decision 18](../../decisions/18-schemas-compose.md) and [decision 19](../../decisions/19-invariants-may-constrain-operations.md).

## Checklist

- [ ] `AttributeSchema.schema?: { $ref }`, mutually exclusive with `valueobject` (`attribute-one-shape` rule); `schema-context` covers it; JSON schema regenerated
- [ ] `InvariantSchema.constrains` accepts consumables of the invariant's aggregate; `invariant-constrains` rule updated; petstore's `SoldNotReopen` names `ChangePetStatus`
- [ ] Pages: schema page links nested schemas; invariant page "Guarded by"; consumable page lists invariants; doc generator follows; skill interview asks "is that a shape of its own?"
- [ ] Root suites green inside the worktree

## Comments

- **lead** (2026-09-06T12:00:00.000Z): Assigned to dev-opus after card 49 lands (the lead will say). Work in your worktree with absolute paths; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
