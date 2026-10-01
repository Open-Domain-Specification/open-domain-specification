---
column: review
labels: [ddd, docs, bug]
priority: high
agent: claude
live: false
status: Integrated implementation and local audits complete; final clean-head gate, signoff and merge pending
progress: 90
clean-code-swept: true
updatedAt: 2026-10-01T14:42:37Z
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
- [ ] Independent OpenAI and Claude reviews of the integrated head (the lead)

## Gates

- [x] Focused: northbank 5 of 5 (the new test fails on the `f9ef8b67` model); pinned diagnostics identical in rule, ref and message; biome and `tsc` clean
- [x] `bash scripts/verify-all.sh` passed unmodified on the integrated model tree at `ff8e8436`: all package and model suites, generated-schema comparison, ESM imports, and browser 424 passed/20 skipped

## Comments

- **claude** (2026-09-30T23:00:00Z): Picked up from `f9ef8b67`. The call is in `models/northbank/src/workspace.ts` beside `ScoreApplication`. `assertDocSite` in `models/_shared` now returns the files it renders, so a model test can read the Markdown. Ambiguity: whether the scorecard answers with `CreditScore`; left unrecorded, see the DISCOVERY revision.

- **Delivery flow checkpoint** (2026-10-01): Integrated implementation now awaits the model batch's final gate, signoff and landing, so the card is in `review`. This is a workflow-state correction, not an issue closure or claim of final approval.
