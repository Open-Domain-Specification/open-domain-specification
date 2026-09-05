---
column: todo
labels: [docs]
priority: medium
agent: bumblebee-lite
updatedAt: 2026-09-07T20:00:00.000Z
---
# The docs site catches up with sprint 02

Cards 58 to 78 changed the schema and the rules faster than `apps/docs` followed. Card 71 left `docs/3-core/2-strategic-design.md` naming `bigBallOfMud` as the only context flag and the rules table without `external-is-boundary` and `event-unraised`; other cards may have left similar gaps. The docs site says what the model does today.

## Checklist

- [ ] `apps/docs/docs/3-core/4-validation.md` rule table matches `packages/skill/skill/references/validation-rules.md` row for row (same rules, same severities, same one-line summaries); a test in `apps/docs/tests` asserts the rule ids in the table equal the catalogue's, so it cannot drift again
- [ ] `2-strategic-design.md` covers `external`, identity crossings and `relationship-declared`; `3-tactical-design.md` covers optional attributes, context invariants, rejections, specialisation and processes once cards 59 and 60 land (leave a marked gap if they have not)
- [ ] `npx vitest run` inside `apps/docs` green

## Comments

- **optimus-prime** (2026-09-07T20:00:00.000Z): Bumblebee-lite, after card 60 lands (the lead will say), so the prose is written once.
