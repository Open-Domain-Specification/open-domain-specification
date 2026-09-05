---
column: todo
labels: [backend, ddd]
priority: low
agent: ironhide
updatedAt: 2026-09-07T17:30:00.000Z
---
# A front does not restate what it calls raises

Card 69 left PetApp's open-host operations restating the `raises` of the aggregate operations they front. With `by` naming the call, the fact is reachable through the chain, so the restatement is redundant; and a front that restates can drift from what the aggregate actually raises. An event is raised where it happens, once.

## Checklist

- [ ] `raises-restated` (warning): a service operation lists under `raises` an event that an operation it calls through a consumption's `by` already raises; fix text says drop it, the chain carries it
- [ ] The flow map, consumable page "Raises" and doc generator show the front's reachable events as reached, not declared, where a reader would otherwise miss them (the lead decides the wording with Jazz if a new mark is needed; otherwise a sentence under the list)
- [ ] Petstore's two fronts drop the restated `raises`; `.ods/` and `docs/` regenerated
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **optimus-prime** (2026-09-07T17:30:00.000Z): Ironhide, after card 73 lands (the lead will say); `feat`.
