---
column: review
labels: [model, bug]
priority: high
agent: lead
live: false
status: Integrated implementation and local audits complete; final clean-head gate, signoff and merge pending
progress: 95
clean-code-swept: true
updatedAt: 2026-10-01T14:42:37Z
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
- **lead** (2026-10-01): Before re-review, a copy scan found two adjacent overclaims: a precondition was described as becoming false after its call, and a context check's lead omitted an event payload its issuing reactor already heard. The Svelte page, core comments, validator guidance, tactical page and decision 27 now state the narrower promise; an existing context-page regression asserts the reactor case. Generated references and the exact-head gate are being refreshed.

- **lead** (2026-10-01): The last source sweep removed an absolute claim that an answer is never saved from the DSL comment and interview guide. The model only guarantees the answer at response time. Drift tests now cover schema, generated reference, DSL and interview copy; 62 drift checks and the focused page checks pass. No high-scored clean-code marker remains.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.
