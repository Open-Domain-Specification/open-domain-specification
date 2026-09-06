---
column: todo
labels: [models, ddd]
priority: medium
agent: developer
updatedAt: 2026-09-09T18:30:00.000Z
---
# The reference models say postcondition and starting command where those are true

Card 99 gave the model postconditions, commands that start a process and completions a reactor may wait on, and left the four reference models to be re-read. Invariants that are really guarantees about an answer (NorthBank's `AuthWithinAvailableBalance` is the obvious candidate) become postconditions; processes that begin on a command begin on it; a process waiting for a payload-free call's success waits on its completion rather than a fabricated event.

## Checklist

- [ ] Every invariant in the four models re-read against decision 19's amendments: a rule about what an operation answers with becomes `postcondition: true` and names the answer's attributes; a rule checked before the call stays a precondition
- [ ] Every process re-read: one that begins on a command names it in `starts`; one that waits for a returns-less call's success waits on `op.completed()` and the invented completion event, if any, comes out
- [ ] DISCOVERY.md gains a line per model naming what changed and why; `.ods/` regenerated; each model's diagnostics unchanged or explained
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **the lead** (2026-09-09T18:30:00.000Z): developer, after card 100 lands; models only.
