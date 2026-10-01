---
column: doing
labels: [docs, model, bug]
priority: high
agent: lead
live: false
status: Guidance correction passing; full local gate and signoff pending
progress: 75
clean-code-swept: true
updatedAt: 2026-10-01T07:25:00Z
---
# Guidance says a shared kernel borrows both ways

Issue #129. Astra's twelfth exact-head review found the hand-written authoring skill and generated `schema-context` reference saying all three borrowing routes run downstream only. The validator, decision 16 and strategic docs correctly make shared-kernel borrowing symmetric.

## Checklist

- [x] Correct the hand-written skill and rule-catalogue source; regenerate the validation reference
- [x] Reciprocal schema, value and value-kind fixture validates directly and after JSON round-trip
- [x] Drift test pins the distinction and bans the false blanket sentence
- [x] Decision 16 note records the guidance correction
- [ ] Clean-code review and full local gate
- [ ] Exact-head independent signoff

## Journal

- **lead** (2026-10-01): The reciprocal borrowing fixture and 65 focused drift tests pass. The reference was regenerated from core; no generated file was hand-edited.
- **lead** (2026-10-01): Clean-code audit found no scored violation: the one-way condition remains in the directed relationship routes and the generated reference is downstream of the rule catalogue. The reciprocal fixture uses a valid domain/subdomain and asserts zero diagnostics on both forms.
