---
column: done
labels: [backend, docs]
priority: medium
agent: senior-developer
live: false
clean-code-swept: true
updatedAt: 2026-09-06T13:00:00.000Z
---
# An external invariant keeps to its contract; a sub-process on a ring is a call; a guard reads what its front fetched; two low defects

The architect's tenth round probed five things the rules do not do as their decisions say. A flagged invariant on an external context escapes every reach rule: `invariant-in-context` iterates modelled contexts only and `external-is-boundary` checks consumable targets only, so an external precondition may name no operation and may constrain a modelled context's entity with no diagnostic. A ring holding two processes is reported as a genuine loop even when the second was started on the ring and ends on it, which is a call at process granularity (a triage process issues a booking, a scheduling process hears it and its end is the slot the first waits on). A precondition's reach is the request and what it composes, so "approve only if the customer is in good standing" cannot name the standing the front fetched before deciding, though that answer exists before the call. `hearsAnswerOf` claims decision 21's single-operation inference but checks only that the consumption is the sole call, so a three-operation consumer with no `by` passes `consumable-kind` while `routesTo` draws no step. And `domain-service-internal` reads an external context's service type, so an external context that writes `domain` is invalid twice. Decisions 19, 23 and 28 are amended.

## Checklist

- [x] An external context's context invariant must carry `precondition` or `postcondition`, must name one of the context's own operations, and may constrain only that operation's request and answer schemas and the context's own value objects; anything else is refused with fix text saying what an external contract may state; tests for each case, including the reach into a modelled context
- [x] `reaction-cycle`: a process on a ring whose entry on the ring is one of its `starts` and whose exit is one of its `ends` is a call, not a reactor, for the lifecycle test; a ring with one live process and, otherwise, only translating policies and such called processes is that process's lifecycle; the message for a ring with two live processes still says what it says; tests for the referral shape and for two genuinely live processes
- [x] A precondition guarding an operation may also constrain attributes of the `returns` schemas of consumables consumed `by` that operation or by the front that calls it in the same context; still not another context's entities; `guardedSchemas` and `invariant-in-aggregate`'s fix text say so; petstore's `ApproveOnlyWhenAvailable` names what it reads
- [x] `hearsAnswerOf` applies the same inference as `routesTo`: a by-less consumption routes only where the consumer provides exactly one operation; `consumable-kind` and the walk agree, and a test pins it
- [x] `domain-service-internal` and every other rule that reads a service's `type` skip external contexts; `ServiceSchema.type` doc says the type is not read on an external context; test
- [x] `apps/docs/docs/3-core/4-validation.md` rows and the skill's references for the rules touched; `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — the doing column's exit gate; `clean-code-swept: true` set after reading back every new helper and message, `npx @biomejs/biome check` clean on the six touched source files, and `bash scripts/verify-all.sh` green end to end (senior-developer, 2026-09-06T13:00:00.000Z)

## Comments

- **senior-developer** (2026-09-06T13:00:00.000Z): All five defects closed against the architect's round-10 probes; `bash scripts/verify-all.sh` green end to end (core 723, graphviz 28, doc 31, skill 26, northbank 3, petstore 23, rivermart 6, streamline 3, _shared 9, pages 764, apps/docs 23, ods-vscode 15, pages e2e 297; petstore schema fixture matches core dist).

  **External invariant.** `external-is-boundary` is the only rule that reads an external context's invariant — every reach rule walks `modelledContexts` — so both halves of decision 28's fourth amendment are asked there now: `packages/core/src/validate.ts:4640-4692` refuses a flagged invariant naming none of the context's own operations and every target outside `externalContractReach` at `packages/core/src/validate.ts:4538-4556` (its own operations, the attributes of the shapes those carry via `guardedSchemas`, its own value objects and their attributes). The cross-context wording is unchanged so the existing refusal reads as it did. Tests at `packages/core/src/validate.test.ts:6919-6979` cover the three probe cases; the correct contract passing is the existing case at `packages/core/src/validate.test.ts:6859-6879`, extended at `packages/core/src/validate.test.ts:6980-6996` to name a value object beside the shapes.

  **A sub-process on a ring is a call.** `isCalledProcess` at `packages/core/src/validate.ts:4200-4211` reads a process whose entry on the ring is one of its `starts` and whose exit — walked forward along the ring's own steps to the next reactor — is one of its `ends` as a call at process granularity, and `liveReactorsOf` at `packages/core/src/validate.ts:4169-4176` drops it; `isProcessLifecycle` and `processThroughTranslatingLayer` both ask their question of the live reactors only (`packages/core/src/validate.ts:4140-4145`, `packages/core/src/validate.ts:4319-4321`). The referral ring is quiet and a ring whose second process waits on it while alive is still reported, at `packages/core/src/validate.test.ts:4246-4348`; the pre-existing two-process ring test still reports, because neither of its processes is live either.

  **A guard reads what its front fetched.** `fetchedByGuard` at `packages/core/src/validate.ts:1139-1158` collects the `returns` of the consumables a guard consumes, or that a front naming the guard in its own `by` consumes, and `guardedSchemas` adds them for a precondition only (`packages/core/src/validate.ts:1195`); the other context's entities are untouched. Fix text at `packages/core/src/validate.ts:1250` and `packages/core/src/validate.ts:1476`. Tests at `packages/core/src/validate.test.ts:1683-1758`. Petstore's `ApproveOnlyWhenAvailable` now names `CheckPetAvailable` and `PetSummary.status` (`models/petstore/src/workspace.ts:687-699`, `models/petstore/src/workspace.ts:853-860`), pinned at `models/petstore/src/workspace.test.ts:328-343`.

  **`hearsAnswerOf`.** Written as `routesTo(...).length > 0` at `packages/core/src/reaction-walk.ts:273-278`, so decision 21's single-operation inference is asked once and `consumable-kind` and the walk cannot disagree. Tests at `packages/core/src/validate.test.ts:7830-7877` pin both directions and assert `hearsAnswerOf`/`routesTo` agree.

  **External service type.** `domain-service-internal` walks `modelledContexts` (`packages/core/src/validate.ts:3677-3678`) and `ServiceSchema.type` says the type is not read on an external context (`packages/core/src/schema.ts:702-716`); test at `packages/core/src/validate.test.ts:6998-7021`.

  **Docs.** Rows for `invariant-in-aggregate`, `invariant-in-context`, `consumable-kind`, `reaction-cycle`, `domain-service-internal` and `external-is-boundary` in `apps/docs/docs/3-core/4-validation.md:33-77`, plus the stale precondition reach in `apps/docs/docs/3-core/3-tactical-design.md:107-119` and the external paragraph in `apps/docs/docs/3-core/2-strategic-design.md:32-44`. `RULE_CATALOG` summaries, why and fix updated for the same six rules, so the generated `packages/skill/skill/references/validation-rules.md` follows; the hand-written `dsl-api.md`, `interview-playbook.md`, `translation-table.md` and `SKILL.md` updated by hand.

  Every model's diagnostics are unchanged: petstore still 0, northbank 3, rivermart 2, streamline 4, the same rules and messages as before the change.

  One choice worth a ruling if the architect disagrees: an external precondition's reach into the shapes is flag-sensitive, through the same `guardedSchemas` every other invariant uses, so a precondition reaches the request and a postcondition the request and the answer. Decision 28's amendment says "that operation's request and answer schemas" without splitting by flag; the narrower reading was taken because decision 19 says a precondition is checked before the answer exists, and nothing else would refuse an external precondition naming an answer.

