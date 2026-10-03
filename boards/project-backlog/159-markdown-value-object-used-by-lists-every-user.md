---
column: done
labels: [docs, bug]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# Markdown's value-object "Used by" lists every user

Issue #110. A reader of generated Markdown sees every user of a value object, in any context, so the column means what the viewer's value-object page says. Model-reading fidelity check in sign-off #108, after cards 157 and 158.

## Checklist

- [x] Decide the promise: every user in the workspace, matching pages' `usagesOf`, plus relations that target the value (an aggregate holds it through either, as before). Not local-only
- [x] Decide nested users: value objects and schemas whose attribute is typed by the value are in the promise, each marked `(value object)` or `(schema)`. Pages lists them already; omitting them would hide a change's reach. Kinds (`specialises`) are not users: they sit under Kinds and inherit, not type an attribute
- [x] Names: a user in another context reads `Context / Name` (the Serves list's form); every user links to its generated page, a value object or schema to `#value-objects` or `#schemas` of its context page
- [x] `usersOfValueObject` in `packages/doc/src/lib/value-objects.ts` replaces `aggregatesHolding` (no other caller)
- [x] Regression on generated NorthBank Markdown: Ledger's Money row lists the exact users read off the model, qualified, with resolvable links and anchors; fails on `fcbbb93e`
- [x] Regenerate by build: petstore and clinic tracked docs move (their Used by now lists nested and cross-context users); NorthBank's docs are untracked; RiverMart and StreamLine unchanged
- [x] No hand-written docs or skill state this column's reach, so none changed
- [x] STATUS.md
- [x] Independent OpenAI and Claude reviews of the integrated head (the lead) — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

## Gates

- [x] Focused: northbank 6 of 6 (the new test fails on the old code), doc 47, petstore 6, rivermart 23, streamline 6, clinic 3; pinned diagnostics identical for all five models; biome and `tsc` clean
- [x] `bash scripts/verify-all.sh` passed unmodified on the integrated model tree at `ff8e8436`: all package and model suites, generated-schema comparison, ESM imports, and browser 424 passed/20 skipped

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).
## Comments

- **claude** (2026-09-30T23:30:00Z): Picked up from `fcbbb93e`. Not touched: the Schemas table's "Used by" header lists a schema's consumables, not its users; that is a separate naming question, not #110. A value object's relations were already counted by the old column and stay counted.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #110 (Markdown value-object users) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/110#issuecomment-5963167144.
