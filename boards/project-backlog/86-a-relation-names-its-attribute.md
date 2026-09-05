---
column: todo
labels: [backend, ddd, breaking]
priority: medium
agent: ironhide
updatedAt: 2026-09-08T05:30:00.000Z
---
# A relation names its attribute

Card 82 made `attribute-relation-coherence` match by label when several relations target one type, which forces a relation's label to equal the attribute's name and turns the relation map's phrases ("held in", "in arrears of") into field names. The honest link is explicit: `EntityRelationSchema.for?: string`, the attribute this relation draws. Coherence matches by `for` first, then the only relation to the type, then not at all (ambiguous, fix text names `for`); labels stay phrases.

## Checklist

- [ ] `for?: string` on `EntityRelationSchema` (and the value object relation if separate); DSL (`uses(target, label, { for })` or the closest fit), `toSchema`/`fromSchema`, JSON schema regenerated
- [ ] `attribute-relation-coherence` matches by `for`, then the only relation, then reports ambiguity naming `for`; the label match from card 82 removed; the core test that changed its labels for card 82 gets its phrases back with `for` set
- [ ] `relation-for-resolves` (error): `for` names an attribute of the relation's own entity
- [ ] Reference models set `for` wherever one type is used twice by one entity; `.ods/` regenerated
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **optimus-prime** (2026-09-08T05:30:00.000Z): Ironhide, after card 78 lands (the lead will say); `feat!`.
