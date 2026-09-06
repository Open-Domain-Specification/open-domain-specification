---
column: todo
labels: [backend, docs]
priority: medium
agent: senior-developer
live: true
updatedAt: 2026-09-10T22:30:00.000Z
---
# A guard reads the event its reactor heard; a mud is not asked how it reacts; the docs carry the costs

The architect's eleventh round found one reach decision 19 never considered and one rule that does not follow decision 28. A precondition may constrain the request and what the guard or its front fetched, but not the payload of the event the reactor heard before issuing the guarded operation: "ship only when the captured amount covers the order total" is refused, and the workaround copies the amount into the request so a rule can point at a fact the context already holds through its subscription. `subscription-backed` iterates every modelled context, so a big ball of mud that consumes our event and states no policy is warned to invent one, though decision 28 exempts a mud from saying how it reacts and `consumption-by-required` already honours that. The DSL's `consumes(consumable)` throws when the options are omitted. Decision 21's decision bullet, the `by` comment in the schema and the docs page still say a policy may be named in `by` on any consumption, which `consumption-by-operation` refuses. And the docs site states the preferences without their costs, which live only in `decisions/`, a path the installed skill does not ship. Decisions 19, 21 and 28 are amended.

## Checklist

- [ ] A precondition guarding an operation may also constrain attributes of the payload schema of an event consumed by the policy or process that issues the guarded operation (through `then`, in the same context); `guardedSchemas`, `invariant-in-aggregate`'s message and fix text and the docs row say so; tests for the fulfilment gate and for an event no reactor of the guard's chain hears (still refused)
- [ ] `subscription-backed` skips a `bigBallOfMud` consumer the way `consumption-by-required` does; test; docs row
- [ ] `consumes(consumable)` defaults its options to `{}` like the other add methods; test
- [ ] The `by` comment on `ConsumptionSchema` and `apps/docs/docs/3-core/3-tactical-design.md` say what the rule asks: operations on an operation consumption, a policy or process on an event consumption (decision 17, second amendment); the model reference regenerates
- [ ] The docs' "What the model leaves out on purpose" section gains the cost of each preference in one sentence (the boundary drawn twice; answers route one hop; a kernel context loses the pairwise fact; union answers and aggregate timers have named reopening conditions; rules carry no comments; translation is prose); `packages/skill/skill/references/preferences.md` carries the same list so an installed skill has it, and `SKILL.md` points there instead of at the repository path
- [ ] `bash scripts/verify-all.sh` green

## Comments
