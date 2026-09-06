---
column: todo
labels: [docs]
priority: high
agent: developer
live: true
updatedAt: 2026-09-11T05:20:00.000Z
---
# The tactical page and the schema comments say what the validator does; four more costs

The architect's fifteenth round found four hand-written sentences the validator contradicts, on surfaces card 129's drift test does not read. The `by` comment on `ConsumptionSchema` and the tactical page say leaving `by` off is fine "where the consumer provides one operation or none", and card 130 made a zero-operation consumer a warning; the generated model reference carries the comment. The tactical page's Policies section says the consumables a policy issues "may belong to other contexts as long as they are not internal", which `policy-in-context` refuses. Decision 22, `specialisation-in-boundary`'s catalogue text, the `ValueObjectSchema.specialises` comment, the tactical page and `SKILL.md` say a value object may be a kind of one borrowed through a shared kernel or as a conformist, and decision 16's second amendment widened borrowing to a customer-supplier downstream. `SKILL.md` says every required collection is present even when empty, which card 104 made untrue. The docs' specialisation example cites NorthBank account kinds the model does not carry. Four costs to name on the list and in `preferences.md`: a refusal enumerates its outcomes and a success does not (decision 18); a value object may hold an identity into an entity but no relation to one (decision 15); calendar-driven behaviour through a Clock costs a relationship and two roles, and the cheaper route is a scheduled operation (decision 28); and the boundary drawn twice is more than half of every stress model's operations (decision 17). Runs in parallel with card 132, which touches the validator, the schema's context flags and the strategic page's flags section; the `by` comment in `schema.ts` and the `specialises` comment are this card's.

## Checklist

- [ ] The four sentences corrected in `packages/core/src/schema.ts` (the `by` comment and the `specialises` comment; comments only), `apps/docs/docs/3-core/3-tactical-design.md` (the `by` sentence, the Policies sentence, the specialisation paragraphs and their example), `packages/skill/skill/SKILL.md` (required collections; specialisation bullet), and `specialisation-in-boundary`'s catalogue `summary`, `why` and `fix` text in `validate.ts` (text only; card 132 does not touch that rule); the model reference regenerates
- [ ] The four costs added to the docs' leaves-out list and to `preferences.md`, with their decisions; the boundary-drawn-twice cost carries the measurement
- [ ] The drift test in `packages/skill` also reads `apps/docs/docs/3-core/3-tactical-design.md`, `2-strategic-design.md` and the two schema comments, pinning these sentences
- [ ] `bash scripts/verify-all.sh` green

## Comments
