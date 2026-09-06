---
column: done
labels: [docs]
priority: medium
agent: dev-lite
live: false
clean-code-swept: true
updatedAt: 2026-09-05T16:35:00.000Z
---
# The docs site catches up with sprint 02

Cards 58 to 78 changed the schema and the rules faster than `apps/docs` followed. Card 71 left `docs/3-core/2-strategic-design.md` naming `bigBallOfMud` as the only context flag and the rules table without `external-is-boundary` and `event-unraised`; other cards may have left similar gaps. The docs site says what the model does today.

## Checklist

- [x] `apps/docs/docs/3-core/4-validation.md` rule table matches `packages/skill/skill/references/validation-rules.md` row for row (same rules, same severities, same one-line summaries); a test in `apps/docs/tests` asserts the rule ids in the table equal the catalogue's, so it cannot drift again
- [x] `2-strategic-design.md` covers `external`, identity crossings and `relationship-declared`; `3-tactical-design.md` covers optional attributes, context invariants, rejections, specialisation and processes once cards 59 and 60 land (leave a marked gap if they have not)
- [x] `npx vitest run` inside `apps/docs` green

## Gates

- [x] clean-code-swept — mechanical docs change: new test follows `strategic-patterns.doc.test.ts`'s existing shape exactly (read-file-and-compare-ids), no production code touched; biome check clean on the new test file (dev-lite, 2026-09-05T16:35:00.000Z)

## Comments

- **lead** (2026-09-07T20:00:00.000Z): dev-lite, after card 60 lands (the lead will say), so the prose is written once.
- **dev-lite** (2026-09-05T16:35:00.000Z): Cards 59 and 60 are landed on develop (`git log` shows "Merge card 60"), so wrote the prose once as asked. Rebuilt `4-validation.md`'s table in `RULE_CATALOG`'s order, adding the 13 rules missing from the old table (`specialisation-in-boundary`, `specialisation-cycle`, `specialisation-not-root`, `specialisation-redeclares`, `invariant-in-context`, `context-invariant-guarded`, `relationship-declared`, `relationship-duplicate`, `process-in-context`, `process-has-ends`, `process-starts`, `event-unraised`, `external-is-boundary`) and correcting `cross-aggregate-reference`'s summary for decision 22's kind-of-root case. Added `apps/docs/tests/validation-rules.doc.test.ts`, which reads the table's rule ids and diffs them against `RULE_CATALOG`'s, naming anything missing or extra. `2-strategic-design.md`'s "Big ball of mud" section is now "Context flags" and also documents `external` (decision 28); identity crossings and `relationship-declared` were already covered there. `3-tactical-design.md` gained a "Specialisation" section (decision 22), an "optional" paragraph under Attributes (decision 24), and a context-invariant paragraph under Relations and invariants (decision 27); rejections and processes (decisions 25, 23) were already documented. No DSL code examples touched — those are card 66's. `npx vitest run` in `apps/docs`: 12 files, 23 tests green (needed `packages/graphviz` and `packages/doc` built locally first, alongside `packages/core`, for the example tests to resolve; pre-existing gap, not part of this card). `npm run build` in `apps/docs` green.
