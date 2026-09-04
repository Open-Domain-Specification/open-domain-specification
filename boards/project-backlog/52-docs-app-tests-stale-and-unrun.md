---
column: backlog
labels: [docs, infra]
priority: med
agent: bumblebee-lite
updatedAt: 2026-09-06T16:10:00.000Z
---
# apps/docs has failing snapshot tests that CI never runs

`apps/docs` has three snapshot tests (`doc.example`, `model.example`, `tactical.example`) that fail on a clean tree, stale since card 40 added `comments`, `disposition` and the Health section, and `apps/docs` has no `test` script, so `lerna run test` and CI never run them. Found by card 45.

## Checklist

- [ ] `apps/docs/package.json` gains a `test` script so the root run and CI include it
- [ ] The three snapshots regenerated from the current output and reviewed line by line for anything that should not be there
- [ ] Root `npm test` green with the docs app included

## Comments

- **optimus-prime** (2026-09-06T16:10:00.000Z): Bumblebee-lite, at the end of sprint 01 after card 50 lands, so the snapshots are regenerated once against the final model, not after every card. Do not start before then.
