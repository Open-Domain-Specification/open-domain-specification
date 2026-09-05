---
column: todo
labels: [backend, bug]
priority: medium
agent: ironhide
updatedAt: 2026-09-09T03:10:00.000Z
---
# `invariant-in-context` refuses a value nobody in the context holds, as its comment says

Card 95 fixed `invariant-in-aggregate` to ask only whether a value object is held inside the boundary. `invariant-in-context` still short-circuits on the value object's own context before the held check, so a context invariant constraining its own value object that no entity or attribute in the context holds validates clean while the rule's comment says it is refused (card 89). Same fix, same test shape, in the other rule.

## Checklist

- [ ] `invariant-in-context` asks whether the value object is held anywhere in the context, own or borrowed, and refuses one that is not; comment and catalogue text match; tests for held-own, held-borrowed, unheld-own
- [ ] The four models re-read for any context invariant that relied on the gap
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Comments

- **optimus-prime** (2026-09-09T03:10:00.000Z): Ironhide, now; `fix`. Small and precise.
