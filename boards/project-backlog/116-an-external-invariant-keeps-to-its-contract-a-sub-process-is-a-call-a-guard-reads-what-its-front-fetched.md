---
column: todo
labels: [backend, docs]
priority: medium
agent: senior-developer
live: true
updatedAt: 2026-09-10T15:40:00.000Z
---
# An external invariant keeps to its contract; a sub-process on a ring is a call; a guard reads what its front fetched; two low defects

The architect's tenth round probed five things the rules do not do as their decisions say. A flagged invariant on an external context escapes every reach rule: `invariant-in-context` iterates modelled contexts only and `external-is-boundary` checks consumable targets only, so an external precondition may name no operation and may constrain a modelled context's entity with no diagnostic. A ring holding two processes is reported as a genuine loop even when the second was started on the ring and ends on it, which is a call at process granularity (a triage process issues a booking, a scheduling process hears it and its end is the slot the first waits on). A precondition's reach is the request and what it composes, so "approve only if the customer is in good standing" cannot name the standing the front fetched before deciding, though that answer exists before the call. `hearsAnswerOf` claims decision 21's single-operation inference but checks only that the consumption is the sole call, so a three-operation consumer with no `by` passes `consumable-kind` while `routesTo` draws no step. And `domain-service-internal` reads an external context's service type, so an external context that writes `domain` is invalid twice. Decisions 19, 23 and 28 are amended.

## Checklist

- [ ] An external context's context invariant must carry `precondition` or `postcondition`, must name one of the context's own operations, and may constrain only that operation's request and answer schemas and the context's own value objects; anything else is refused with fix text saying what an external contract may state; tests for each case, including the reach into a modelled context
- [ ] `reaction-cycle`: a process on a ring whose entry on the ring is one of its `starts` and whose exit is one of its `ends` is a call, not a reactor, for the lifecycle test; a ring with one live process and, otherwise, only translating policies and such called processes is that process's lifecycle; the message for a ring with two live processes still says what it says; tests for the referral shape and for two genuinely live processes
- [ ] A precondition guarding an operation may also constrain attributes of the `returns` schemas of consumables consumed `by` that operation or by the front that calls it in the same context; still not another context's entities; `guardedSchemas` and `invariant-in-aggregate`'s fix text say so; petstore's `ApproveOnlyWhenAvailable` names what it reads
- [ ] `hearsAnswerOf` applies the same inference as `routesTo`: a by-less consumption routes only where the consumer provides exactly one operation; `consumable-kind` and the walk agree, and a test pins it
- [ ] `domain-service-internal` and every other rule that reads a service's `type` skip external contexts; `ServiceSchema.type` doc says the type is not read on an external context; test
- [ ] `apps/docs/docs/3-core/4-validation.md` rows and the skill's references for the rules touched; `bash scripts/verify-all.sh` green

## Comments
