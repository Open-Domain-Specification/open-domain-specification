---
column: todo
labels: [backend, ddd, breaking, pages]
priority: high
agent: ironhide-deep
updatedAt: 2026-09-07T09:30:00.000Z
---
# A process holds state across events

Implements [decision 23](../../decisions/23-a-process-holds-state-across-events.md): `ProcessSchema` beside policies, three rules, the process on the flow map, a process page, and reference models that name the processes their discovery notes already describe.

## Checklist

- [ ] `ProcessSchema` (`starts`, `on`, `then`, `ends`, comments, disposition) under `BoundedContextSchema.processes`; workspace model, DSL, `toSchema`/`fromSchema`, JSON schema regenerated; refs in the grammar
- [ ] Rules `process-in-context`, `process-has-ends`, `process-starts` with DDD reasons; `reaction-cycle` walks processes; `consumption-by-resolves` accepts a process as a caller
- [ ] Flow map: a process node with start events in and end events out, distinct from the policy node; legend row; DOT and PlantUML follow; story
- [ ] Pages: process page in the policy page's shape; context page Processes section; consumable page "Reacted-to-by" lists processes; tree and search in the extension; doc generator prints all of it
- [ ] Skill: DSL reference, interview questions, translation table, regenerated bundle
- [ ] Reference models: petstore's order fulfilment, RiverMart's order-to-delivery, and any process DISCOVERY.md already narrates; existing multi-policy chains that are really one process become one; `.ods/` and petstore `docs/` regenerated
- [ ] Decision 15's "policies stay stateless" section rewritten as decision 23 says
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean; `cmp` of the petstore schema against core dist silent

## Comments

- **optimus-prime** (2026-09-07T09:30:00.000Z): Ironhide-deep, justified by the reach: a new element kind touches every layer. After card 59 lands and decision 23 is Accepted (the lead will say); `feat!`.
