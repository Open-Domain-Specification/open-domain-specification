---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Seventh signoff round found incoming reference and context rule omissions; correction and focused tests pass, integrated gate pending
progress: 85
clean-code-swept: true
updatedAt: 2026-10-01T04:15:00Z
---
# Entity pages name cross-aggregate references and context rules

Issue #117. The seventh signoff round's Claude Opus 5.5 high review reproduced two old reader lies. Petstore's Shipment references Carrier across aggregates, while Carrier's entity page said nothing points at it. NorthBank's Lending context invariant `OneOpenApplicationPerCustomer` names LoanApplication, while that entity page said no invariant names it and ascribed every listed rule to the root. Markdown and the context page already name those facts.

## Checklist

- [x] Incoming scans direct relations naming the entity across every workspace aggregate and value object, including inherited source relations, and says the source's aggregate or context
- [x] Constrained by scans aggregate and context invariants naming the entity and shows which boundary keeps each rule
- [x] Petstore Carrier and NorthBank LoanApplication regressions render before and after JSON round-trip with working links and no false empty claims
- [x] A zero-diagnostic kind fixture checks inherited outgoing and incoming relation readings
- [ ] Pinned model diagnostics and generated outputs are unchanged

## Gates

- [x] Focused EntityPage tests and Svelte check
- [ ] `bash scripts/verify-all.sh` on the corrected integrated head
- [ ] Exact-head final signoff after the gate

## Journal

- **lead** (2026-10-01): Issue #117 records the reader story. The old incoming lookup stopped at the entity's aggregate; the rule lookup stopped at aggregate rules. The shared Svelte page now reads direct incoming relations and rules throughout the workspace, and the optional Kept by column distinguishes aggregate and context invariants. Its empty relation state says direct, leaving parent-typed possible references to the broader model. The three focused cases pass. No schema or validator rule changed.
- **lead** (2026-10-01): Clean-code pass: workspace lookups live once in the pages leaf module, the entity page only formats their result, and the invariant table shares its existing optional owner column. The loops are finite and preserve workspace order; no unchecked product lookup or high-scored clean-code finding remains. Focused tests, Svelte check and format pass.
