---
column: todo
labels: [backend, ddd]
priority: high
agent: ironhide
updatedAt: 2026-09-08T15:40:00.000Z
---
# A child's id may be held in the same context; any service may guard; a standard's value rules are contract

Codex review run 3, issues 1, 3 and 9. Card 90 closed a "side door" by refusing `identifies` on a non-root entity of another aggregate in the same context; that was wrong: a shipment holding an order line's id (with the order's id beside it) is how DDD points at a child without a relation, and `cross-aggregate-reference` rightly refuses the relation. Card 90 let an aggregate invariant name an application-service guard but not a domain-service one; a domain service is where a rule that reads two aggregates lives. And card 90 refused value object invariants on an external context; an IBAN's checksum or an ISO 20022 field rule is the standard's published contract and the model should be able to state it.

## Checklist

- [ ] `identifies-entity` accepts any entity of any context again, root or child; the same-context refusal from card 90 and its test come out; the fix text on `cross-aggregate-reference` says "hold its id" for a child too; decision 14 amended by the lead
- [ ] `invariant-in-aggregate` accepts an operation of any service of its own context, application or domain, as the guard; decision 19 amended by the lead
- [ ] An external context may carry value objects with invariants, and `valueObjectInvariantsOf` walks them so they are checked like any other; `external-is-boundary` keeps refusing aggregates, policies, processes and context invariants; decision 28 amended by the lead; a reference model states one where its discovery notes name a standard's rule (NorthBank's IBAN checksum if the IBAN value belongs to the scheme, otherwise none)
- [ ] `bash scripts/verify-all.sh` green; diagnostics per model unchanged or explained

## Comments

- **optimus-prime** (2026-09-08T15:40:00.000Z): Ironhide, now; `feat`. Small and precise; do not widen it.
