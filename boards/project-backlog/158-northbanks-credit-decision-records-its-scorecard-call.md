---
column: done
labels: [ddd, docs, bug]
priority: high
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-10-02T23:42:13Z
---
# NorthBank's credit decision records its scorecard call

Issue #109. A reader following a credit decision sees `Decide` run the scorecard, so the structured flow agrees with the model's description and the Head of Credit Risk's interview ("pull a bureau report ..., run the scorecard, and check affordability", `models/northbank/DISCOVERY.md:169-181`). Model-fidelity check in sign-off #108, after card 157.

## Checklist

- [x] Smallest truthful call: `decisioningApp.consumes(scoreApplication, { by: [decide] })`, a local consumption, no pattern, no schema, no `returns`; decision 17 and the validator allow it unchanged
- [x] Decide whether the source requires an answer: it does not (the interview says the scorecard is run, never what it returns), so no contract is invented
- [x] Assertion through DSL, JSON round trip, `callsOut`, the flow map edge and Markdown (front page and context table); fails on the `f9ef8b67` model
- [x] Regenerate NorthBank's `.ods` and `docs/` by build
- [x] `DISCOVERY.md` revision with the open question on the scorecard's answer
- [x] STATUS.md
- [x] Independent OpenAI and Claude reviews of the integrated head (the lead) — OpenAI Astra low APPROVED exact reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; owner-authorized OpenAI-only exception applies; no Claude approval is claimed.

## Gates

- [x] Focused: northbank 5 of 5 (the new test fails on the `f9ef8b67` model); pinned diagnostics identical in rule, ref and message; biome and `tsc` clean
- [x] `bash scripts/verify-all.sh` passed unmodified on the integrated model tree at `ff8e8436`: all package and model suites, generated-schema comparison, ESM imports, and browser 424 passed/20 skipped

- [x] exact-head-landing — `bash scripts/verify-all.sh` passed unmodified on clean reviewed candidate `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` (exit 0): core 1,596, graphviz 50, doc 82, skill 154, Pages 1,056, docs 24, VS Code app 22, host-checker 31; browser 431 passed / 20 documented baseline skips; Pages coverage 100%; exact model pins held. Merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. This is product-candidate evidence, not a gate rerun on this metadata update (lead, 2026-10-02T23:42:13Z).
## Comments

- **claude** (2026-09-30T23:00:00Z): Picked up from `f9ef8b67`. The call is in `models/northbank/src/workspace.ts` beside `ScoreApplication`. `assertDocSite` in `models/_shared` now returns the files it renders, so a model test can read the Markdown. Ambiguity: whether the scorecard answers with `CreditScore`; left unrecorded, see the DISCOVERY revision.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.

- **lead** (2026-10-02T23:42:13Z): Reconciled issue #109 (scorecard call) after its individual acceptance comment was published and the issue closed. Reviewed product SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899` was APPROVED by OpenAI Astra low; PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e` and merged tree `6efd1aa35bae524dfce9345210096caeafcef236` equals the reviewed tree. Exact-head local gate passed; actual VS Code hosts passed 16 with four documented optional screenshot skips, keyboard passed 23, checker exit 0 (generic host coverage; no dedicated NorthBank Money assertion). Owner-authorized OpenAI-only exception applies; no Claude approval is claimed. Issue comment: https://github.com/Open-Domain-Specification/open-domain-specification/issues/109#issuecomment-5963166680.
