---
column: todo
labels: [backend, ddd]
priority: high
agent: dev-opus
updatedAt: 2026-09-06T12:00:00.000Z
---
# A context acts through its own boundary

Implements [decision 17](../../decisions/17-a-context-acts-through-its-own-boundary.md): rules `policy-in-context`, `aggregate-not-public`, `domain-service-internal`, and the petstore restructured so PetApp is the open host.

## Checklist

- [ ] The three rules with catalogue entries and tests
- [ ] Petstore: Pet's `ReservePet`/`MarkPetSold` internal; PetApp provides the public operations (open-host-service) that consume them; Sales policies name Sales' own operations; Fulfilment's policy likewise; petstore validates clean; the other three models corrected where the shape repeats
- [ ] Docs: the DDD strategic page and the skill's interview say what an aggregate offers stays inside the context; skill references regenerated
- [ ] Consumable map and `assertDocSite` green for four models

## Comments

- **lead** (2026-09-06T12:00:00.000Z): Assigned to dev-opus after cards 44, 45 and 47 land (the lead will say). Work in your worktree with absolute paths; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
