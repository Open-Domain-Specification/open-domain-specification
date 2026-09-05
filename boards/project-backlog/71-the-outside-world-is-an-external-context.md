---
column: todo
labels: [backend, ddd, breaking, pages]
priority: high
agent: ironhide
updatedAt: 2026-09-07T10:00:00.000Z
---
# The outside world is an external context

Implements [decision 28](../../decisions/28-the-outside-world-is-an-external-context.md): `external` on a bounded context, `external-is-boundary`, `event-unraised`, a stereotype on the map, and the reference models name the systems they integrate with.

## Checklist

- [ ] `external?: boolean` on `BoundedContextSchema`; workspace model, DSL, `toSchema`/`fromSchema`, JSON schema regenerated
- [ ] `external-is-boundary` (error) and `event-unraised` (warning) with DDD reasons; `context-serves-subdomain` and every internals rule skip an external context; the shared stress assertion in `models/_shared` no longer demands a team of an external context
- [ ] Context map: external stereotype («external system») and legend row in Svelte Flow, DOT and PlantUML; context page header fact; tree in the extension; doc generator
- [ ] Skill: DSL reference, interview question "which systems outside the business does this talk to?", regenerated bundle
- [ ] Reference models: NorthBank's card scheme and sanctions provider, RiverMart's payment provider, StreamLine's licensors, wherever DISCOVERY.md names them; events those systems send become events those contexts provide; `.ods/` and petstore `docs/` regenerated; any `event-unraised` warning left in a model is a real finding fixed or justified in DISCOVERY.md
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean; `cmp` of the petstore schema against core dist silent

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Ironhide, after card 70 lands (the lead will say); `feat!`.
