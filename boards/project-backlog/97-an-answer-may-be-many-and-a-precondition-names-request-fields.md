---
column: done
labels: [backend, ddd, breaking]
priority: medium
agent: senior-dev
clean-code-swept: true
live: false
updatedAt: 2026-09-09T07:40:00.000Z
---
# An answer may be many; a precondition names the request fields it checks

Codex review run 5, issues 6 and 8. Swagger's `findByStatus` answers with a root array of pets and the model wraps it in a `Pets` schema, which is a different shape from the contract; a `many` mark on `returns` says the truth without a wrapper. A freight quotation's precondition, pickup before delivery and a positive weight, checks fields of the request and no aggregate exists yet; `constrains` may not name a schema's attributes, so the rule lives in prose.

## Checklist

- [x] `ConsumableSchema.returns` becomes `{ $ref, many?: boolean }`; `many` means the answer is a list of that shape; DSL, `toSchema`/`fromSchema`, JSON schema; the consumable page, doc generator and skill say "returns many"; petstore's `FindPetsByStatus` returns many `PetSummary` and the `Pets` wrapper comes out; RiverMart's `SearchResults` stays, because its answer really is an object with hits; decision 13 amended by the lead
- [x] A precondition (`precondition: true`) may constrain attributes of the schema its guarded operation takes as `schema`, returns, or rejects with; `invariant-in-aggregate` and `invariant-in-context` accept those targets only for preconditions; a non-precondition invariant naming a schema attribute is still refused with the reason; decision 19 amended by the lead; test with the review's quotation example
- [x] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Gates

- [x] clean-code-swept — swept my own diff against SRP/DRY/NAMING/KISS; the one finding was mine, a four-branch ternary the new schema case added to `invariant-in-aggregate`, fixed by extracting `outsideAggregate` in packages/core/src/validate.ts:1148-1174 (senior-dev, 2026-09-09T07:40:00.000Z)
- [x] verify-all — `bash scripts/verify-all.sh` green end to end, 1458 unit tests across the packages and models plus 297 pages e2e (senior-dev, 2026-09-09T07:35:00.000Z)

## Comments

- **lead** (2026-09-09T05:20:00.000Z): the senior developer, now; `feat!`. Precise; do not widen.
- **senior-dev** (2026-09-09T07:40:00.000Z): Both additions done.

  **An answer may be many.** `ConsumableSchema.returns` is now `{ $ref, many? }` (packages/core/src/schema.ts:306-324). The DSL takes either a schema or `{ schema, many }` in one field, so a list can never be declared without the shape it is a list of (packages/core/src/workspace.ts:1206-1216); the consumable keeps `returns` and `returnsMany` (packages/core/src/workspace.ts:1236-1240, 1272-1277) and `toSchema` leaves `many` off when it is false (packages/core/src/workspace.ts:1369-1372). `Answer` gains `many` and its `origin` reads "X returns many Y" (packages/core/src/workspace.ts:1432-1456). The JSON schema is regenerated from the type, so no hand-editing. Surfaces: the consumable page's fact, its TOC entry and its section heading all read "Returns many" (packages/pages/src/lib/templates/ConsumablePage.svelte:6-14, 139-145, 168-182), the aggregate page's subsection likewise (packages/pages/src/lib/molecules/ConsumableSubsection.svelte:39-41), the schema page's carriers column says "returns many" (packages/pages/src/lib/templates/SchemaPage.svelte:42-48), and the doc generator's Returns cell reads `many [PetSummary](...)` (packages/doc/src/consumables.md.ts:21-31). Skill: `dsl-api.md`, `translation-table.md` and the interview playbook now ask "one of those, or a list of them?" and warn off wrappers. Petstore's `FindPetsByStatus` returns many `PetSummary` and the `Pets` wrapper is gone (models/petstore/src/workspace.ts:404-421); RiverMart's `SearchResults` is untouched, because its answer really is an object with hits.

  **A precondition names the request fields it checks.** `invariant-in-aggregate` and `invariant-in-context` accept an attribute of a schema the guarded operation takes, returns or rejects with, and only for `precondition: true` (packages/core/src/validate.ts:1023-1068). A refusal now says which of the two reasons it is: an invariant that is no precondition is told a rule kept true on every save is about the model, not a transport shape; a precondition naming someone else's schema is told no operation it guards handles that shape. The review's freight quotation is the test — pickup before delivery and a positive weight on a `Quote Request` no aggregate holds — for the aggregate's rule, the context's rule, the answer schema, the wrong schema and the non-precondition (packages/core/src/validate.test.ts:1211-1302, 1371-1394).

  **Diagnostics per model, unchanged:** petstore none; northbank `relationship-declared` (warning), `separate-ways`, `consumable-kind`, `context-serves-subdomain` (warning); rivermart `aggregate-root`, `cross-aggregate-reference`; streamline `internal-consumable`, `schema-context`, `policy-complete` (warning). Each model asserts its own expected list in its suite and all pass, so nothing moved.

  **verify-all summary:** core 548, graphviz 27, doc 31, skill 26, northbank 3, petstore 20 (schema comparison: match), rivermart 3, streamline 3, models/_shared 9, pages 753 (coverage thresholds 100%), apps/docs 23, apps/ods-vscode 15, pages e2e 297 passed. `npx tsc --noEmit` clean in core, doc, pages, skill and petstore; `npm run check` in pages: 939 files, 0 errors, 0 warnings; biome clean on every file touched.

  One judgement call for the lead, made narrowly: the DSL takes `returns: { schema, many }` as one field rather than a second `returnsMany` flag beside `returns`, so the two cannot disagree. Every existing `returns: someSchema` call site is unchanged.
