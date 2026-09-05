---
column: todo
labels: [models, tests]
priority: medium
agent: ratchet
updatedAt: 2026-09-07T09:00:00.000Z
---
# Reference models carry no deliberate partnership warnings

RiverMart and StreamLine each keep a `partnership-backed` warning in their `deliberate` arrays because the honest fix, demoting a one-way partnership to customer-supplier, would break the shared stress assertion that every model shows all five relationship types. A reference model that bends to a test is not a reference. The assertion changes and the models tell the truth.

## Checklist

- [ ] `models/_shared/src/index.ts`: the five-types assertion becomes a check that the four models together show all five types (a shared test in `models/_shared` or the lead's choice), so no single model has to invent a relationship type
- [ ] RiverMart and StreamLine: each one-way partnership becomes what its prose supports, a customer-supplier with the roles the traffic implies, or gains the traffic its description already claims; the `partnership-backed` entries leave the `deliberate` arrays; DISCOVERY.md section 7 updated
- [ ] Every remaining `deliberate` entry across the four models re-read: each must be a planted teaching example with a sentence in DISCOVERY.md saying what it teaches, or it is fixed
- [ ] All four models build with exactly their `deliberate` lists and pass; `.ods/` regenerated; pages fixture tests green

## Comments

- **optimus-prime** (2026-09-07T09:00:00.000Z): Ratchet; no core change. Runs in parallel with card 58, which touches attributes in the same model files; keep your edits to relationships and DISCOVERY.md so the merge stays clean.
