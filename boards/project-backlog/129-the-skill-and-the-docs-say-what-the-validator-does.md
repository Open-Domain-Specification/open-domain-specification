---
column: todo
labels: [docs]
priority: high
agent: developer
live: true
updatedAt: 2026-09-11T01:10:00.000Z
---
# The skill and the docs say what the validator does

The architect's thirteenth round read the installed skill and the docs site alone and found six hand-written claims the validator contradicts, and two costs not yet named. `SKILL.md` says a dangling ref stops the whole file loading and that loading may throw (decision 29: it loads and reports `unresolved-ref`). `SKILL.md`, the interview playbook and the tactical page say a value object or schema crosses only over a shared kernel (decision 16: a conformist borrows too). `SKILL.md` and the generated model reference, from a stale comment on `ValueObjectSchema.specialises` in the schema, say a specialisation parent borrows only over a shared kernel. `preferences.md` still says an answer routes one hop through a front (card 126: it follows the local `by` chain and stops at the boundary), against the docs page. The strategic page says `relationship-declared` warns on an identity crossing until a relationship is declared (decision 14: it does not). `SKILL.md` says a reference targets the root only, and `cross-aggregate-reference` also accepts a kind of the root. Two costs to add to the leaves-out list and `preferences.md`: the wire and the model are typed apart, an entity never carries a schema and a schema never names an entity, so a resource-style API restates its aggregate as schemas (decision 09); and a workspace is one file until decision 08 lands, said in one line of `json-mode.md` and nowhere else. Runs in parallel with card 128, which touches the validator and the walk, not these files.

## Checklist

- [ ] The six claims corrected in `packages/skill/skill/SKILL.md`, `references/interview-playbook.md`, `references/preferences.md`, `apps/docs/docs/3-core/3-tactical-design.md`, `apps/docs/docs/3-core/2-strategic-design.md`, and the `specialises` comment in `packages/core/src/schema.ts` (comment only; the model reference regenerates)
- [ ] The two costs added to the docs' leaves-out list and to `preferences.md`, with their decisions
- [ ] A test in `packages/skill` that fails when a hand-written reference states one of these six claims again (grep for the exact old sentences), so the drift cannot silently return
- [ ] `bash scripts/verify-all.sh` green

## Comments
