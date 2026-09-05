---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: ironhide
updatedAt: 2026-09-07T09:00:00.000Z
---
# An attribute may be optional

Implements [decision 24](../../decisions/24-an-attribute-may-be-optional.md): `AttributeSchema.optional?: boolean`, `identity-not-optional`, marks on every attribute table, the interview question, and the reference models set it where their source says so.

## Checklist

- [ ] `optional?: boolean` on `AttributeSchema`; workspace model, DSL, `toSchema`/`fromSchema`, JSON schema regenerated
- [ ] `identity-not-optional` (error) with a DDD reason in its doc comment and catalogue entry
- [ ] Pages: `AttributeTable` marks an optional attribute in the design language (Jazz's call if the mark is new; otherwise the existing keyword style); story and test; doc generator prints it
- [ ] Skill: DSL reference, interview question "which of these are always present?", regenerated bundle
- [ ] Reference models: petstore from the Swagger contract (`Pet.tag` at least); the other three only where DISCOVERY.md or a comment already says a field is sometimes absent; `.ods/` and petstore `docs/` regenerated
- [ ] Decision 15's deferred-flag sentence points at decision 24
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean; `cmp` of the petstore schema against core dist silent

## Comments

- **optimus-prime** (2026-09-07T09:00:00.000Z): Ironhide, first schema card of sprint 02; `feat!`. `git fetch && git reset --hard origin/develop` and `npm install` in the worktree before anything.
