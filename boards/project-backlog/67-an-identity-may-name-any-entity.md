---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
updatedAt: 2026-09-07T10:00:00.000Z
---
# An identity may name any entity, not only a root

Prowl's review, finding 1: `identifies-root` refuses `PlaybackSession.profileId identifies Profile` and `episodeId identifies Episode`, so StreamLine carries no `identifies` on either and nothing flags the silence. A claim against a coverage inside a policy, an appeal against a decision inside a case: real systems cross boundaries by child identity constantly, and the child stays inside its aggregate exactly because its parent's invariants need it there. The rule's fix text ("it should be an aggregate of its own") contradicts those invariants. Decision 14 is amended: an identity names an entity; if that entity is not a root, the dependency is on the aggregate reached through its root, and the map draws it so.

## Checklist

- [ ] `identifies-root` becomes `identifies-entity` (error): the ref resolves to an entity, root or not; doc comment and catalogue give the DDD reason (you hold the child's id and reach it through its root); `cross-context-relation`'s fix text stops promising a root
- [ ] Relation map draws the identity edge to the named entity; when it is a child, the edge lands on the child inside its aggregate's cluster
- [ ] Reference models: StreamLine's `PlaybackSession.profileId` and `episodeId`, and every other bare child id the sweep rule on the skill's playbook would catch, set `identifies`; `.ods/` regenerated
- [ ] Decision 14's amendment paragraph updated (the lead writes the ruling; you write the mechanics if it needs a sentence)
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Ironhide, after card 58 lands (the lead will say). `feat!` because the models change.
