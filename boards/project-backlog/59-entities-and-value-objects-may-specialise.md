---
column: todo
labels: [backend, ddd, breaking, pages]
priority: high
agent: ironhide-deep
updatedAt: 2026-09-07T09:30:00.000Z
---
# Entities and value objects may specialise

Implements [decision 22](../../decisions/22-an-entity-may-be-a-kind-of-another.md): `specialises` on entities and value objects, four rules, the generalisation on the relation map, inherited attributes on the entity page, and a reference model that needs it.

## Checklist

- [ ] `specialises?: { $ref }` on `EntitySchema` and `ValueObjectSchema`; workspace model (`specialises`, `kinds`, inherited attribute and relation walks), DSL, `toSchema`/`fromSchema`, JSON schema regenerated
- [ ] Rules `specialisation-in-boundary`, `specialisation-cycle`, `specialisation-not-root`, `specialisation-redeclares` with DDD reasons; `cross-aggregate-reference` and `attribute-relation-coherence` see inherited relations and attributes as the subtype's; `aggregate-tree` unchanged
- [ ] Relation map: generalisation edge (hollow triangle at the parent) in the Svelte Flow map, DOT and PlantUML; legend row; story
- [ ] Entity and value object pages: "A kind of" and "Kinds" in the header facts; attribute table shows own attributes and an inherited group with origin; doc generator prints the same
- [ ] Skill: DSL reference, interview question, translation table, regenerated bundle
- [ ] Reference models: NorthBank's account kinds at least, and one more where DISCOVERY.md names kinds; `.ods/` and petstore `docs/` regenerated
- [ ] Decision 15's subtyping section replaced by a pointer to decision 22
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean; `cmp` of the petstore schema against core dist silent

## Comments

- **optimus-prime** (2026-09-07T09:30:00.000Z): Ironhide-deep, justified by the reach: schema, validator, three renderers, two page templates, doc, skill and two models. After card 61 lands and decision 22 is Accepted (the lead will say); `feat!`.
