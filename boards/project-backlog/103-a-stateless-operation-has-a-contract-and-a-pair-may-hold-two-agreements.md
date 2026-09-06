---
column: todo
labels: [backend, ddd, breaking]
priority: high
agent: senior-developer
updatedAt: 2026-09-09T23:30:00.000Z
---
# A stateless operation has a contract; a postcondition reads the request; a pair may hold two named agreements

Codex review run 7, issues 1, 2 and 11, each reproduced. Card 100 refused `precondition` and `postcondition` on a context invariant so it could never claim to hold after its operation, and left a freight quotation service, which stores nothing, with no home for "weight must be positive" and "the quote respects the tariff". A postcondition may reach the answer's attributes but not the request's, so "every returned itinerary arrives by the requested time" cannot name the requested time. And `relationship-duplicate` refuses a second directed relationship in one direction between a pair, which decision 15 said to reopen when one pair in one direction needs two dispositions: a negotiated fulfilment API and a tolerated legacy feed from the same warehouse are that case.

## Checklist

- [ ] A context invariant may carry `precondition` or `postcondition`: both are checks, before or after the operation they name, and neither claims to hold at rest; `context-invariant-is-checked` refuses only a context invariant with no flag that names no guard, and the page says "checked before" or "checked after"; the quotation example validates with both rules on the context; decision 27 amended by the lead
- [ ] A postcondition's admissible targets include the guarded operation's request schema and everything it composes, as a precondition's do; the review's itinerary example (answer attribute constrained against request attribute) validates; decision 19 amended by the lead
- [ ] `ContextRelationshipSchema.name?: string`: a second directed relationship between one pair in one direction is allowed when both carry distinct names; the ref of a named relationship appends the name; `relationship-duplicate` refuses only unnamed duplicates; `findRelationship` and every reader of the pair key follow; the context map draws two lines labelled by name; the reference models unchanged unless one already narrates two agreements; decision 15 amended by the lead
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained; the review's three probes rerun

## Comments

- **the lead** (2026-09-09T23:30:00.000Z): senior-developer, now; `feat!`.
