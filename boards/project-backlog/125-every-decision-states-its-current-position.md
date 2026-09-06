---
column: done
labels: [docs]
priority: high
agent: lead
live: false
updatedAt: 2026-09-10T22:30:00.000Z
---
# Every decision states its current position

The architect's eleventh round: the decisions are a changelog, and superseded statements are still in force on the page. Decision 23 has twelve amendments and notes, decision 28 ten; decision 21's decision bullet says `by` may name policies on any consumption, which `consumption-by-operation` refuses; decision 29's decision list still says both flags are refused. Anyone learning the metamodel from `decisions/` has to read every record to its last note. Each decision gets a dated `## Current position` section directly under its status, stating what holds today in a few sentences and naming the amendment that last moved each point; the history below it stays as written. The architect drafts from the records, the lead reviews and applies.

## Checklist

- [x] A `## Current position (2026-09-10)` section in every decision 01 to 29, written from the record's last word on each point, naming the card or amendment that decided it
- [x] Where a decision bullet is contradicted by a later amendment, the current position says so in one sentence; the bullet is not edited
- [x] The docs site's pointer to `decisions/` says to read the current position first
- [x] `bash scripts/verify-all.sh` green (a doc test may read decision files): run on the card 124 landing, which carries this card's docs change through the gate; CI on the push covers the decisions

## Comments

- 2026-09-10, lead: the architect drafted all twenty-nine sections from the records (scratchpad `current-position/`), flagging ten inconsistencies between records; the lead read the flags, spot-checked 17, applied every section directly under the status block, and settled each flag with a dated note on the decision it concerns (02, 08, 12, 13, 15, 17, 20, 27, 29). The docs pointer says to read the current position first.
