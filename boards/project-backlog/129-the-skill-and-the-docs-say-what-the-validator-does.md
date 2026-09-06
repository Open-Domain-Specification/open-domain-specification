---
column: review
labels: [docs]
priority: high
agent: developer
live: false
clean-code-swept: true
updatedAt: 2026-09-06T17:15:00.000Z
---
# The skill and the docs say what the validator does

The architect's thirteenth round read the installed skill and the docs site alone and found six hand-written claims the validator contradicts, and two costs not yet named. `SKILL.md` says a dangling ref stops the whole file loading and that loading may throw (decision 29: it loads and reports `unresolved-ref`). `SKILL.md`, the interview playbook and the tactical page say a value object or schema crosses only over a shared kernel (decision 16: a conformist borrows too). `SKILL.md` and the generated model reference, from a stale comment on `ValueObjectSchema.specialises` in the schema, say a specialisation parent borrows only over a shared kernel. `preferences.md` still says an answer routes one hop through a front (card 126: it follows the local `by` chain and stops at the boundary), against the docs page. The strategic page says `relationship-declared` warns on an identity crossing until a relationship is declared (decision 14: it does not). `SKILL.md` says a reference targets the root only, and `cross-aggregate-reference` also accepts a kind of the root. Two costs to add to the leaves-out list and `preferences.md`: the wire and the model are typed apart, an entity never carries a schema and a schema never names an entity, so a resource-style API restates its aggregate as schemas (decision 09); and a workspace is one file until decision 08 lands, said in one line of `json-mode.md` and nowhere else. Runs in parallel with card 128, which touches the validator and the walk, not these files.

## Checklist

- [x] The six claims corrected in `packages/skill/skill/SKILL.md`, `references/interview-playbook.md`, `references/preferences.md`, `apps/docs/docs/3-core/3-tactical-design.md`, `apps/docs/docs/3-core/2-strategic-design.md`, and the `specialises` comment in `packages/core/src/schema.ts` (comment only; the model reference regenerates)
- [x] The two costs added to the docs' leaves-out list and to `preferences.md`, with their decisions
- [x] A test in `packages/skill` that fails when a hand-written reference states one of these six claims again (grep for the exact old sentences), so the drift cannot silently return
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — six claims corrected, two costs added, drift test written, verify-all.sh green end to end (developer, 2026-09-06T17:15:00.000Z)

## Comments

- **developer** (2026-09-06T16:55:00.000Z): Read decisions 29, 16, 22, 21, 14, 09, 08 and the corresponding rules in `packages/core/src/validate.ts` (`unresolvedRef`/loader in decision 29's note, `specialisationInBoundary` and `mayBorrowFrom` at packages/core/src/validate.ts:596-622, `crossContextRelation`/`schemaContext` around packages/core/src/validate.ts:298-345, `relationshipDeclared` at packages/core/src/validate.ts:2053-2088, `cross-aggregate-reference` at packages/core/src/validate.ts:279-292) and `routesTo`/`callChainReaches` in `packages/core/src/reaction-walk.ts:344-384` to confirm each of the six claims against current behaviour before editing.
- **developer** (2026-09-06T17:00:00.000Z): Corrected the specialises comment on `ValueObjectSchema` at packages/core/src/schema.ts:744-750 (borrowing is shared-kernel or conformist, decision 22), then rebuilt core and the skill so `packages/skill/skill/references/model-reference.md` and the reference models' bundled `.ods/schema.json` copies regenerated from it.
- **developer** (2026-09-06T17:05:00.000Z): Corrected `packages/skill/skill/SKILL.md:77-78,86,102-105,126-129` (dangling ref diagnoses rather than throws, specialisation and payload/value-object borrowing admit a conformist, `references` accepts a kind of the root), `packages/skill/skill/references/interview-playbook.md:88-89` (borrowing question), and `packages/skill/skill/references/preferences.md:41-44` (answer stops at the boundary, matching the docs page) plus its two new cost bullets (wire/model typed apart — decision 09; a workspace is one file until decision 08 lands).
- **developer** (2026-09-06T17:08:00.000Z): Corrected `apps/docs/docs/3-core/2-strategic-design.md:93-98` (`relationship-declared` no longer asked for an identity crossing, decision 14) and `apps/docs/docs/3-core/3-tactical-design.md:117` (value objects also borrow as a conformist) plus its leaves-out list's two new cost bullets, matching preferences.md.
- **developer** (2026-09-06T17:10:00.000Z): Added `packages/skill/src/validator-drift.test.ts`, wired the same way as `packages/skill/src/bundle.test.ts` (reusing `packageRoot` from `scripts/generate.mts`), asserting none of the six old sentences (in every wording they appeared in, across SKILL.md, interview-playbook.md, preferences.md, json-mode.md, the two docs pages and schema.ts) can be found in those files' text with whitespace normalised. 10 assertions, all passing (`npm test` in `packages/skill`).
- **developer** (2026-09-06T17:14:00.000Z): Ran `bash scripts/verify-all.sh` end to end after confirming no extension host was running and port 4173 was free: core 750, graphviz 28, doc 31, skill 36 (incl. the 10 new drift tests), northbank 3, petstore 23 (schema comparison matched), rivermart 6, streamline 3, clinic 7, models/_shared 9, pages 765, apps/docs 23, apps/ods-vscode 15, pages e2e 297 — all green on the first run, no retry needed. Commits: `d76b3af` docs, `3112af2` docs(skill), `84c81aa` docs, `8b0d1d2` test(skill). Card to review.
