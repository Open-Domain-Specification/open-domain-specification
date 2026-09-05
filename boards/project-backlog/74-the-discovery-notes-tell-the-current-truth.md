---
column: todo
labels: [models, docs]
priority: low
agent: bumblebee-lite
updatedAt: 2026-09-07T10:00:00.000Z
---
# The discovery notes and model headers tell the current truth

Prowl's review, finding 14: StreamLine's and RiverMart's headers say "three deliberate mistakes" while their tests assert four; both DISCOVERY.md files say four in section 7 and "exactly those three" in section 9; RiverMart's sections 4 and 6 still describe cross-context `references` and a per-aggregate value object; StreamLine's section 9 rejects a finding on grounds decision 14 reversed; petstore's section 9 "kept" a policy issuing another context's operation, which decision 17 forbids; NorthBank cites decision 15 for the rule that is decision 14.

## Checklist

- [ ] Each of the four DISCOVERY.md files read top to bottom against the current rules (`apps/docs/docs/3-core/4-validation.md`) and decisions 13 to 28; every stale count, rule name, decision number and "kept" that the model no longer does corrected; each `deliberate` entry named in section 7 with what it teaches
- [ ] Each model's `workspace.ts` header comment matches its `deliberate` array
- [ ] No model or test change beyond comments; models still build and pass

## Comments

- **optimus-prime** (2026-09-07T10:00:00.000Z): Bumblebee-lite, after cards 63 and 72 land (the lead will say), so the prose is corrected once.
