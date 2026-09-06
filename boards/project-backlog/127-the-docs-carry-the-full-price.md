---
column: todo
labels: [docs]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-10T23:50:00.000Z
---
# The docs carry the full price

The architect's twelfth round read the docs site and the installed skill alone and found they name most refused shapes and why, and six costs, and not the rest: that `identifies` is opt-in and a denormalised copy is invisible (decision 14); that specialisation inside one aggregate repeats attributes across product lines (22); that versions are names and the reopening point is three concurrent versions (15); that multiplicity is read from the source only; that order and timing are not modelled; that `raises` says may, not which combination; that a consumption's ref changes when a second consumption of the pair appears (26); that a kernel's co-owners are not listed and a context has one team (16); that lifecycle states and transitions are prose and a deadline is an interval from a trigger, never a data-fixed date (15, 23); that inside a context `references` and `identifies` are two forms of one dependency (14); and that an answer routing one hop across a boundary is an error, not a caveat. Runs after card 126, which changes the last of these.

## Checklist

- [ ] `apps/docs/docs/3-core/3-tactical-design.md` "What the model leaves out on purpose" carries every cost above in one sentence each, with the decision number; `packages/skill/skill/references/preferences.md` mirrors it
- [ ] The aggregate page of the docs says where a lifecycle lives (a status attribute whose values are the author's text, invariants naming the operations that move it, no transition table) and the process page says a deadline is relative to its trigger
- [ ] `bash scripts/verify-all.sh` green

## Comments
