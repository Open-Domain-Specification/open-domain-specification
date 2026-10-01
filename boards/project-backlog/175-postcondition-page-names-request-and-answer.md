---
column: doing
labels: [model, bug]
priority: high
agent: lead
live: false
status: Tenth signoff blocker in correction; local full gate pending
progress: 95
clean-code-swept: true
updatedAt: 2026-10-01T05:10:00Z
---
# Aggregate postcondition page names request and answer

Issue #125. On exact head `edee33cb`, OpenAI Astra low rendered a valid aggregate postcondition relating a request deadline to the answer's arrival. Its detail page claimed every constrained field came from the answer or refusal. The same Svelte page serves the extension, static export and viewer.

## Checklist

- [x] Postcondition detail copy describes request, answer/refusal and applicable model elements without excluding valid targets
- [x] Adjacent unflagged aggregate and context precondition copy is scoped to the validator's reach
- [x] Focused Svelte test renders request and answer fields before and after JSON round-trip with zero errors
- [ ] Full local gate and exact-head independent signoff

## Journal

- **lead** (2026-10-01): The focused component test passes. It proves the renderer lists both fields under the corrected sentence.

- **lead** (2026-10-01): Clean-code audit found the wording change local to the shared page. The focused rendering, Svelte check and pages coverage pass. No high-scored marker remains.
