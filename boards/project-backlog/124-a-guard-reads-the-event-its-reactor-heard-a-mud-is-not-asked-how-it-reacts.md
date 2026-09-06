---
column: done
labels: [backend, docs]
priority: medium
agent: senior-developer
live: false
clean-code-swept: true
updatedAt: 2026-09-11T09:40:00.000Z
---
# A guard reads the event its reactor heard; a mud is not asked how it reacts; the docs carry the costs

The architect's eleventh round found one reach decision 19 never considered and one rule that does not follow decision 28. A precondition may constrain the request and what the guard or its front fetched, but not the payload of the event the reactor heard before issuing the guarded operation: "ship only when the captured amount covers the order total" is refused, and the workaround copies the amount into the request so a rule can point at a fact the context already holds through its subscription. `subscription-backed` iterates every modelled context, so a big ball of mud that consumes our event and states no policy is warned to invent one, though decision 28 exempts a mud from saying how it reacts and `consumption-by-required` already honours that. The DSL's `consumes(consumable)` throws when the options are omitted. Decision 21's decision bullet, the `by` comment in the schema and the docs page still say a policy may be named in `by` on any consumption, which `consumption-by-operation` refuses. And the docs site states the preferences without their costs, which live only in `decisions/`, a path the installed skill does not ship. Decisions 19, 21 and 28 are amended.

## Checklist

- [x] A precondition guarding an operation may also constrain attributes of the payload schema of an event consumed by the policy or process that issues the guarded operation (through `then`, in the same context); `guardedSchemas`, `invariant-in-aggregate`'s message and fix text and the docs row say so; tests for the fulfilment gate and for an event no reactor of the guard's chain hears (still refused)
- [x] `subscription-backed` skips a `bigBallOfMud` consumer the way `consumption-by-required` does; test; docs row
- [x] `consumes(consumable)` defaults its options to `{}` like the other add methods; test
- [x] The `by` comment on `ConsumptionSchema` and `apps/docs/docs/3-core/3-tactical-design.md` say what the rule asks: operations on an operation consumption, a policy or process on an event consumption (decision 17, second amendment); the model reference regenerates
- [x] The docs' "What the model leaves out on purpose" section gains the cost of each preference in one sentence (the boundary drawn twice; answers route one hop; a kernel context loses the pairwise fact; union answers and aggregate timers have named reopening conditions; rules carry no comments; translation is prose); `packages/skill/skill/references/preferences.md` carries the same list so an installed skill has it, and `SKILL.md` points there instead of at the repository path
- [x] `bash scripts/verify-all.sh` green

## Comments

- **senior-developer** (2026-09-11T09:40:00.000Z): Reproduced both rule findings against the architect's round-11 probes before touching anything: P6 (the fulfilment gate) reported one `invariant-in-aggregate` error and P26 (the mud subscription) one `subscription-backed` warning.

  The reach. `packages/core/src/validate.ts:1132` factors out `guardChain`, the guard plus the fronts of its own context whose call reaches it — the set `fetchedByGuard` already computed inline and the new `heardByGuardsReactor` at `packages/core/src/validate.ts:1199` needs too, since decision 17 puts the public operation on the application service and it is the front, not the aggregate's transition, that a reactor issues. `heardByGuardsReactor` collects the payload schemas of the events a policy or process of the guard's context is subscribed to, where that reactor issues the guard or one of its fronts; `guardedSchemas` at `packages/core/src/validate.ts:1251` adds them for a precondition only, beside what the guard fetched. A command a process starts on is issued rather than heard and is excluded, as is an answer, which `fetchedByGuard` already owns. The refusal sentence at `packages/core/src/validate.ts:1306` and the message tail at `packages/core/src/validate.ts:1518` name the new reach, as do the `summary`, `why` and `fix` of `invariant-in-aggregate` and the `summary`/`why` of `invariant-in-context`, which shares `guardedSchemas` and so shares the reach.

  The mud. `subscriptionBacked` at `packages/core/src/validate.ts:3434` now walks `knowableContexts` rather than `modelledContexts`, which is the one-word difference between "not external" and "not external and not a mud", and is exactly the exemption `consumption-by-required` already applies to the other side of the same exchange.

  The DSL. `consumes` defaults its options to `{}` on both `Service` (`packages/core/src/workspace.ts:1263`) and `Aggregate` (`packages/core/src/workspace.ts:1337`).

  The `by` wording. `packages/core/src/schema.ts:444`, the two DSL comments in `packages/core/src/workspace.ts` and `apps/docs/docs/3-core/3-tactical-design.md:295` now say what the rules ask: operations on an operation consumption, policies and processes on an event consumption, citing `consumption-by-operation` and `consumption-by-reactor`. `packages/skill/skill/references/model-reference.md` regenerated from the skill build.

  The costs. `apps/docs/docs/3-core/3-tactical-design.md:37` adds one sentence per preference under "What the model leaves out on purpose", and `packages/skill/skill/references/preferences.md` carries the same list plus the preferences themselves, so an installed skill has it without the repository; `packages/skill/skill/SKILL.md:109` points there instead of at `decisions/15-what-the-model-leaves-out.md`. Docs rows for both rules updated at `apps/docs/docs/3-core/4-validation.md:34` and `apps/docs/docs/3-core/4-validation.md:58`.

  Tests: four at `packages/core/src/validate.test.ts:1791` (the gate with a process, with a front between the reactor and the guard, with a stateless policy, and the refusal at `packages/core/src/validate.test.ts:1831` of a payload no reactor of the guard's chain heard), three at `packages/core/src/validate.test.ts:8676` (mud silent, external silent, a modelled consumer in the same shape still warned) and three at `packages/core/src/workspace.test.ts:850` (`consumes(x)` with no options, on a service and on an aggregate). Both probes re-run clean afterwards: P6 zero diagnostics, P26 down to the four unrelated ones the probe's own scaffold produces.

  Every model's diagnostics are unchanged: the only diff under `models/` is the one regenerated `by` description line in each `.ods/schema.json`, and all five model suites pass. `bash scripts/verify-all.sh` green end to end on the first run, no retry needed.

## Gates

- [x] clean-code-swept — swept the diff: the front-finding duplicated between the two reach helpers is now one `guardChain`, the mud exemption reuses the existing `knowableContexts` iterator rather than a second flag test, and biome check --write is clean (senior-developer, 2026-09-11T09:40:00Z)
