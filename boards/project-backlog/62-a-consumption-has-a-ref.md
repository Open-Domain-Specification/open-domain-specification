---
column: todo
labels: [backend, extension, pages]
priority: medium
agent: ironhide
updatedAt: 2026-09-07T09:00:00.000Z
---
# A consumption has a ref of its own

Implements [decision 26](../../decisions/26-a-consumption-has-a-ref.md): a stable, pair-derived ref for every consumption; rules report at it; the extension maps it to a JSON position; pages anchor at the row.

## Checklist

- [ ] `Consumption.ref` in core, derived from consumer and consumable in the ref grammar (no index); lookup by ref; grammar written in the skill's reference
- [ ] `role-coherence`, `mud-needs-acl`, `disposition-needs-comment`, `consumption-by-resolves` report at the consumption's ref; tests updated
- [ ] Extension: ref-to-position resolves a consumption to its element in `consumes[]` in the JSON file; test
- [ ] Pages: navigating to a consumption ref lands on the consumer page at the row, flashed like other leaf refs; test
- [ ] Root suites green inside each package in build order; pages at 100% with `npm run check` clean

## Comments

- **optimus-prime** (2026-09-07T09:00:00.000Z): Ironhide, after card 61 lands (the lead will say); `feat`, no schema change.
