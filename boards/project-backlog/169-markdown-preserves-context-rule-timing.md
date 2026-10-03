---
column: done
labels: [model, bug]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Markdown preserves context rule timing

Issue #119. On exact head `a2cef010`, OpenAI Astra low reproduced a valid `postcondition: true` on a context operation. Its Svelte page said Checked after, while generated Markdown said every context rule was checked before acting and hid the timing flag. The lead also checked decision 28's valid external event postcondition: that is a guarantee of the event payload, not an operation answer.

## Checklist

- [x] Markdown context rules have a Check column distinguishing precondition, postcondition, unflagged checker and external event payload guarantee
- [x] Valid before/after operation rules and an external event guarantee render before and after JSON round-trip
- [x] The Svelte invariant page reads an external event guarantee and links to the event with the correct kind
- [x] The shared Svelte context page no longer says every rule is checked before acting or denies operation/event contracts when its local rule list is empty
- [x] Schema comments, generated authoring reference, interview guide and tactical documentation describe the same timing
- [x] Pinned diagnostics and generated outputs remain consistent

## Gates

- [x] Focused Markdown, Svelte and type checks
- [x] `bash scripts/verify-all.sh` passed on `5bb730fa`: doc 51, pages 1017 with 100% coverage, browser 430 passed/20 skipped, all model/schema/import checks green
- [x] Exact-head independent final signoff — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).
## Journal

- **lead** (2026-10-01): Issue #119 records the reader story. The context table now prints timing as a separate fact, and the lead extended the correction to decision 28's event-only published contract. No validator behavior changed. The new tests pass for operation timing and an event payload before and after round-trip.
- **lead** (2026-10-01): Clean-code pass: the Markdown row derives its label from existing flags and guarded targets, and the Svelte page uses one event-only predicate for its heading and text. Generated reference changes come from the core build. No high-scored marker or unsafe lookup remains.
- **lead** (2026-10-01): Adjacent reading check found the same old before-acting sentence on the Svelte context page and an empty state that claimed all other rules belonged to aggregates. Its copy is now scoped to context declarations and directs the reader to each rule's detail page. The edge-case fixture contains a postcondition and its regression rejects the old sentence.
- **lead** (2026-10-01): The first integrated gate on `752238df` stopped at the pages 100% coverage threshold: the new mixed event-and-operation guarantee branch lacked a test. A valid external-context fixture now exercises that branch before and after round-trip in Svelte and Markdown. The pages unit suite passes at 100% coverage; the full gate will run on the corrected committed head. The build regenerated model schema descriptions and context Markdown, and those generated files are included in this correction.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #119 (Markdown invariant timing) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/119#issuecomment-5963171858.
