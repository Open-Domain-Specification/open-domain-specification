---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Eighth signoff found entity attribute-rule omissions; correction and focused tests pass, integrated gate pending
progress: 85
clean-code-swept: true
updatedAt: 2026-10-01T05:05:00Z
---
# Detail pages name attribute rules

Issue #120. On exact head `a2cef010`, Claude Opus 5.5 high found NorthBank Account, PaymentInstruction and RiverMart Order entity pages saying no invariant names them. Valid aggregate and context rules name their attributes, rather than the entity itself. The common lookup also feeds value-object detail pages and must include inherited attributes on kinds.

## Checklist

- [x] Shared lookup finds rules naming an element or one of its declared or inherited attributes, once and in workspace order
- [x] NorthBank Account and PaymentInstruction rule rows and keepers render before and after JSON round-trip
- [x] An entity kind's inherited attribute and a borrowed value's attribute appear under the correct rule owner
- [x] Detail-page copy and root tooltip make only claims their rows establish
- [ ] Pinned diagnostics and generated outputs remain consistent

## Gates

- [x] Focused entity/value-object tests and Svelte check
- [ ] `bash scripts/verify-all.sh` on the corrected committed head
- [ ] Exact-head independent final signoff

## Journal

- **lead** (2026-10-01): Issue #120 records the reader story. The shared leaf lookup now tests each rule target against the element and its `allAttributes`; the latter includes inherited attributes. It preserves direct target identity, does not infer that a rule on a held value applies to every entity, and leaves the aggregate/context owner column intact. Focused NorthBank and synthetic kind tests pass.
- **lead** (2026-10-01): Clean-code pass: one lookup serves both detail pages; a set of the target's attributes avoids repeated hierarchy walks, and the template retains presentation only. No duplicate rule branch or unsafe product lookup remains.
