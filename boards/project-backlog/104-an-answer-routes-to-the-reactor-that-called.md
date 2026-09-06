---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: senior-developer-deep
updatedAt: 2026-09-10T01:00:00.000Z
---
# An answer routes to the reactor that called; the rules the seventh review reproduced; a local value object's line is derived

The architect's seventh review, each item probed. `routesTo` returns every caller named on every consumption of an operation in a context, so two processes in one context that both call one operation each receive the other's answer, the flow map draws it wrong and `reaction-cycle` reports a ring that does not exist; `hearsAnswerOf` lets a non-caller hear an answer when one consumption exists. A process that raises its own start event is exempt as a lifecycle though each pass spawns a new instance. `relationship-cycle`'s fix text says declare a partnership, and the rule does not read one. `relationship-declared` still says "no relationship says how they stand" on a declared separate-ways pair for consumptions and subscriptions. A precondition may reach an answer it cannot have seen. Every local value-object attribute must be restated as a `uses` relation while a borrowed one's line is derived. And a JSON context must write eight empty maps.

## Checklist

- [ ] `routesTo` returns only the callers among the operations the waiting reactor issues (or the reactor itself when named in `by`); `hearsAnswerOf`'s single-consumption clause applies only when that consumption names no `by`; the review's two-processes-one-operation probe validates clean and the flow map draws each answer to its own reactor; decision 23 amended by the lead
- [ ] `isProcessLifecycle` does not exempt a ring that re-enters the process through a `starts` trigger; test with `starts(Started).issues(Restart raising Started)`
- [ ] `relationship-cycle` treats two contexts joined by a partnership as one for the walk, so a declared partnership clears the ring the fix text promises it clears; test with the review's probe P6
- [ ] `relationshipJoins` reports a consumption or subscription across a declared separate-ways pair under `separate-ways` only, never under `relationship-declared`; NorthBank's deliberate quick-quote case reports once
- [ ] `guardedSchemas` gives a precondition the request and what it composes, and a postcondition the request, the answer and the rejections; the rule texts and decision 19 say the same (the lead amends 19)
- [ ] `attribute-relation-coherence` no longer demands a declared `uses` for a local value-object attribute: the line is derived from the attribute as it is for a borrowed one, a declared `uses` stays legal and adds a label or cardinality, and the rule checks only that a declared relation agrees with its attribute; the relation map draws derived lines; decision 16 noted by the lead
- [ ] Every map on `BoundedContextSchema`, `AggregateSchema` and `ServiceSchema` and `relations` on entities and value objects are optional in the schema and default to empty on load; the JSON schema regenerated; the extension's minimal example and the skill's minimal example shrink accordingly
- [ ] `mud-needs-acl`'s fix text for an identity says an anti-corruption-layer consumption from the mud clears it, which is what the rule reads
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained; the review's probes P3, P4, P5, P6, P16 rerun

## Comments

- **the lead** (2026-09-10T01:00:00.000Z): senior-developer-deep, after card 103 lands; `feat!`.
