---
column: todo
labels: [backend, docs]
priority: high
agent: senior-developer
live: true
updatedAt: 2026-09-11T09:10:00.000Z
---
# A process hears the answer of the call its start made; an external consumer is not asked how it protects itself; the surfaces say what the newest amendment says

The architect's sixteenth round found no rule doing the opposite of its decision on a shape a first model would write, and these. A process that starts on a command whose handler makes the first outbound call cannot wait on that call's answer, because an answer routes only to a reactor that issued the call and the process issued nothing yet; the clean form costs one more internal operation and event, and RiverMart's `Hold attempt` passes only because a second `by` happens to exist. Decision 23 now says the operation that starts a process is the process's own first step, so the process hears the answers of the calls that operation made. The shortest workaround for that gap, a process that starts on and issues the same operation, validated clean though it spawns instances, because `reEntersWhileAlive` accepted a ring closed by the start step. `role-coherence` asks an external consumer of our event for a downstream role, which is its inside (decision 28). The JSON schema requires `attributes` on `Entity` and `DataSchema` while the loader accepts their absence, so the two authoring surfaces disagree. And five hand-written sentences drifted after the latest amendments (a boundary-only context's schema as an identity target; borrowing routes in `SKILL.md`; an external invariant on its own event; optional collections; the specialisation table row), `SKILL.md` still tells an author to default to conformist against decision 03, the `identifies` comment does not mention boundary-only, and the generator renders a symmetric relationship's participants as "array of unknown". Decisions 11, 15, 23 and 28 are amended.

## Checklist

- [ ] `routesTo` and `hearsAnswerOf`: a process hears the answer of a call made `by` an operation that starts it (through the local `by` chain from that operation), across a boundary still one hop; `consumable-kind` follows; tests for the checkout saga whose start command's handler calls `Pay` (clean) and for a process starting on a different command (still refused); RiverMart's `Hold attempt` unchanged and still clean
- [ ] `reEntersWhileAlive`: a ring closed by the process's own `starts` step is not re-entry while alive; a process that starts on and issues the same operation is reported as spawning instances; test
- [ ] `role-coherence` asks no downstream role of an external or boundary-only consumer; test for the partner carrier subscribing to our event
- [ ] `EntitySchema.attributes` and `DataSchemaSchema.attributes` optional in the schema so the JSON schema and the loader agree; JSON schema regenerated; test that ajv and the loader accept the same file
- [ ] The sentences corrected: `apps/docs/docs/3-core/3-tactical-design.md` (identity targets, near line 195) and the `identifies` comment in `schema.ts` (lines 53-64) name external, mud and boundary-only contexts and their schemas; `packages/skill/skill/SKILL.md` borrowing routes (near 104-106), external invariant (97-103), optional collections (72-75), and the default-conformist guidance (171, 185) which now says a customer-supplier downstream writes no role and a conformist is the downstream with no say; `apps/docs/docs/3-core/2-strategic-design.md` external invariants (68-72); `references/dsl-api.md` line 18; the `specialisation-in-boundary` row of the validation table; `generate.mts` renders a symmetric relationship's participants as two refs
- [ ] The drift test pins the current wording positively for the facts that drifted twice (borrowing routes, external invariants, identity targets, optional collections), so a future amendment that changes the fact fails the test until the sentence follows
- [ ] Skill references regenerated; every model's diagnostics unchanged; `bash scripts/verify-all.sh` green

## Comments
