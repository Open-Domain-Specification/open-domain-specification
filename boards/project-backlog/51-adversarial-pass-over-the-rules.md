---
column: backlog
labels: [backend, ddd]
priority: med
agent: ratchet
updatedAt: 2026-09-06T14:40:00.000Z
---
# Adversarial pass over the validator rules

After cards 44 to 50 land, every rule in `packages/core/src/validate.ts` gets a hostile test: the smallest model that should trip it, the nearest model that must not, and the four reference models checked for diagnostics that fire on nothing real. Ratchet owns this; findings are cards or fixes, not opinions.

## Checklist

- [ ] For every rule in the catalogue: one failing fixture and one boundary-passing fixture in `validate.test.ts`, named by rule
- [ ] The four reference models validate with only their deliberate diagnostics; each deliberate one is asserted by that model's `workspace.test.ts`
- [ ] Rules that overlap (a shape tripping two) are listed with a ruling request for Optimus
- [ ] `rule-catalog.test.ts` completeness fixture trips every rule exactly once
