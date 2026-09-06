---
column: todo
labels: [docs, backend]
priority: high
agent: developer
live: true
updatedAt: 2026-09-10T17:20:00.000Z
---
# The record says what it means

A five-whys on ten reviewer contradictions (owner's instruction, 2026-09-10) found the same root cause behind most: the reasoning lives in `decisions/`, which the docs site never links and the skill never explains; the docs site and skill never say the model has preferences that are not DDD's laws; rule messages name a refusal without the replacement the record intends; and several schema comments and decision sentences say the opposite of what the record means. The decisions are corrected (15, 16, 23, 27, 28 on 2026-09-10). This card fixes what a developer reads. Runs after card 116, which touches the validator.

## Checklist

- [ ] `apps/docs/docs/3-core/3-tactical-design.md`: a paragraph "What the model leaves out on purpose" near the top listing the preferences (no delivery flag, no coordination fields on a process, no modules, no actors, no read-model element, no operations on a value object, an entity has one home, a context invariant records the check not the store) with a link to the repository's `decisions/15` and the folder; §Events and operations gains "type is kind, not delivery; a queued command is still an operation" and "an operation people call through a screen is consumed by nobody, and that is normal"; §Processes documents `deadlines` (`after`, `from`) and says all-or-any of `on` and what it undoes are prose on purpose; the context-invariant lines say "records who checks it, not how strongly the store holds it"; §Schemas says an external context's schemas are also the kinds it publishes, which `identifies` may name; §Value objects says a value provides no operations; a new short §Read models (query service, `returns` the view's shape, a policy writes it); the cross-context invariant line gains the wallet-and-escrow example
- [ ] `apps/docs/docs/3-core/2-strategic-design.md`: §Context flags says what an external context may state (schemas, value invariants, a contract on its own operation); the shared-kernel lines say a pairwise kernel shares values and schemas directly and a jointly owned entity is an aggregate of a kernel context both consume
- [ ] `apps/docs/docs/3-core/index.md`: the Domain Hierarchy tree refreshed (Process, deadlines, context invariants, `external`, `bigBallOfMud`, `returns`, `rejects`, `reasons`) and a pointer to `decisions/`
- [ ] `packages/core/src/schema.ts` comments: `PolicySchema.on` drops "synchronous because the operation is"; the Process description says how long it waits is a deadline; `DataSchemaSchema` says on an external context a schema is also a published kind; regenerated references follow
- [ ] `packages/core/src/validate.ts` messages and fix text: `relationship-cycle` fix gains the queued-command clause; `context-invariant-is-checked` why says who checks, not how strongly the store holds; `external-is-boundary` message and fix name the schema-plus-`identifies` route; `cross-context-relation` and `specialisation-in-boundary` fix name the kernel-context route for a kernel pair; `consumption-by-reactor` message carries the projection clause its fix already has; `invariant-in-context` message names the policy-or-process route; the docs rule table follows
- [ ] `packages/skill/skill/references/interview-playbook.md` Phase F asks "who asks it to do that, a person at a screen, another part, a schedule?" and records the answer in the description; `translation-table.md` gains rows for "the clerk does X" and "we share Product with them"; `SKILL.md` gains one line saying the omissions are preferences, not DDD's laws, and where the list is
- [ ] `bash scripts/verify-all.sh` green

## Comments
