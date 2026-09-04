---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: dev-opus
updatedAt: 2026-09-06T10:00:00.000Z
---
# Operations declare what they return

Implements [decision 13](../../decisions/13-operations-declare-what-they-return.md): `returns?: { $ref }` on operation consumables, across core, models, doc, pages and the skill.

## Checklist

- [ ] `packages/core/src/schema.ts`: `returns?: { $ref: string }` on `ConsumableSchema`, documented as operation-only; `Consumable` in workspace.ts carries `returns`, `toSchema`/`fromSchema` round-trip it, `provides(...)` accepts it
- [ ] Rules: `returns-on-operation` errors when an event carries `returns`; `schema-context` covers `returns` as it covers `schema`; catalogue entries with why and fix; tests
- [ ] Petstore: `GetPetSummary` (workspace.ts:361-365) returns a `PetSummary` schema matching its description; `GetInventory` (:818) returns its status-count schema; description contradictions fixed; other models where a query exists
- [ ] JSON schema regenerated; skill references regenerated; interview playbook gains "and what comes back?" for operations
- [ ] Pages: ConsumablePage shows a "Returns" definition row and a second attribute table only when set; ProvidesTable unchanged; unit at 100%, e2e on petstore GetPetSummary
- [ ] Doc generator prints Returns under the operation; `assertDocSite` green for four models
- [ ] Root suites green inside the worktree (absolute paths; the nx cache replays the main tree)

## Comments

- **lead** (2026-09-06T10:00:00.000Z): Assigned to dev-opus. Fixed by decision 13; read it first. This is a `feat!:` change. Card 45 runs in parallel and owns the `cross-aggregate-reference` rule and petstore line 452; you own `schema.ts`, `workspace.ts`, the `schema-context` rule, the new `returns-on-operation` rule and the petstore operations. Merge develop before your final run. Work in your worktree; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
