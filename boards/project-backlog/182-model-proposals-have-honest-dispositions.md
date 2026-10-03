---
column: done
labels: [docs, ddd]
priority: high
agent: lead
live: false
clean-code-swept: true
updatedAt: 2026-10-03T00:37:40.943212+00:00
---
# Model proposals have honest dispositions

Issues #35, #36, #37, #38, #39, #40, #64 and #65. Resolve each existing proposal against current decisions 15–18 and source-backed reopening conditions. These are disposition outcomes, not implemented capabilities. Reconcile #63 while retaining #59 then #54.

## Checklist

- [x] Read current decisions and the six individual source/cost/trigger assessments; no reopening trigger met in current reference sources
- [x] #35 individual not-planned disposition recorded and actual state verified: [#35](https://github.com/Open-Domain-Specification/open-domain-specification/issues/35) closed not planned; [comment](https://github.com/Open-Domain-Specification/open-domain-specification/issues/35#issuecomment-5963518840). Reopen when a blind or interview-rewritten source model has a domain service that owns a rule and must call across a boundary (decision 17); cost: external consumption sits on a local application-service front.
- [x] #36 individual not-planned disposition recorded and actual state verified: [#36](https://github.com/Open-Domain-Specification/open-domain-specification/issues/36) closed not planned; [comment](https://github.com/Open-Domain-Specification/open-domain-specification/issues/36#issuecomment-5963519345). Reopen when a source-backed model has a process waiting on an operation that returns two or more non-refusal shapes and branches on which came back (decision 18); cost: alternative shapes stay prose or type text.
- [x] #37 individual not-planned disposition recorded and actual state verified: [#37](https://github.com/Open-Domain-Specification/open-domain-specification/issues/37) closed not planned; [comment](https://github.com/Open-Domain-Specification/open-domain-specification/issues/37#issuecomment-5963519809). Reopen when a reference model has a rule that must read an internal grouping of a context (decision 15); cost: tactical elements stay flat within a context.
- [x] #38 individual not-planned disposition recorded and actual state verified: [#38](https://github.com/Open-Domain-Specification/open-domain-specification/issues/38) closed not planned; [comment](https://github.com/Open-Domain-Specification/open-domain-specification/issues/38#issuecomment-5963520375). Reopen only on source evidence meeting decision 15's complete three-part test for value-object behaviour; cost: a behaviour change does not identify affected consumers.
- [x] #39 proposal retained, no claim that decision 16 accepts/rejects it, not-planned disposition recorded: [#39](https://github.com/Open-Domain-Specification/open-domain-specification/issues/39) closed not planned; [comment](https://github.com/Open-Domain-Specification/open-domain-specification/issues/39#issuecomment-5963520843). Retained cost made explicit on that same published comment (ledger event `disposition-cost-made-explicit`). Reopen when a source-backed system names the participants, who owns or changes the shared part, and a fact the pairwise or kernel-context forms state falsely or omit.
- [x] #40 individual not-planned disposition recorded and actual state verified: [#40](https://github.com/Open-Domain-Specification/open-domain-specification/issues/40) closed not planned; [comment](https://github.com/Open-Domain-Specification/open-domain-specification/issues/40#issuecomment-5963521259). Reopen only on a source and reference model showing one of decision 15's three wrong-answer conditions; cost: delivery timing stays prose and the walk does not model transport.
- [x] #64 and #65 reconcile child dispositions, close not planned after their children, no feature-delivery claim: [#64](https://github.com/Open-Domain-Specification/open-domain-specification/issues/64) closed not planned; [comment](https://github.com/Open-Domain-Specification/open-domain-specification/issues/64#issuecomment-5963530962) after #36, #38 and #39; [#65](https://github.com/Open-Domain-Specification/open-domain-specification/issues/65) closed not planned; [comment](https://github.com/Open-Domain-Specification/open-domain-specification/issues/65#issuecomment-5963531593) after #35 and #40. The ledger records `features_claimed: false` for both: parent scope was reconciled and no feature was delivered.
- [x] #63 remains open with #59 foundation then #54 forms; module promise removed without losing four-reader/identity/save acceptance: [#63](https://github.com/Open-Domain-Specification/open-domain-specification/issues/63) open, order 59 then 54, modules excluded under decision 15 and the proposal retained separately (ledger event `authoring-epic-scope-reconciled`).
- [x] Actual backlog census 29 to 21, with additions/reopenings accounted for: 21 open, 33 closed (25 implemented plus 8 not planned), 0 new, 0 reopened, against the 54-open baseline (checkpoint and open-after-dispositions evidence).

## Gates

- [x] Metadata quality check and unmodified scripts/verify-all.sh: eight Sonnet 5.5 lenses found no introduced finding above 0.5; full gate passed on clean record candidate `4ccb76bbb38c74506f32fd5dfad785ef088867a6` (exit 0), all exact pins, schema and ESM checks, 431 browser passes / 20 baseline skips. Final record publication still requires its own frozen-candidate gate; actual identity/result are recorded via durable CURRENT.json.

## Comments

- **lead** (2026-10-03T00:16:37.231948+00:00): Picked up Milestone 2 after model closeout records 0109d39e passed the complete unmodified gate and landed on develop. Source disposition packet: /Users/jonathanturnock/.codex/ods-delivery/milestone-02/5a624128/preparation.json. No model implementation or new final review is required. Each child receives its own retained cost and reopening condition; parents are reconciled last.
- **lead** (2026-10-03): Milestone 2 dispositions were published to GitHub and verified against the action ledger `/Users/jonathanturnock/.codex/ods-delivery/milestone-02/disposition-execution/actions.jsonl`. #35, #36, #37, #38, #39 and #40 were each commented and closed as not planned between 00:17:03Z and 00:17:20Z, with comment URLs recorded per issue above.
- **lead** (2026-10-03): #39's retained cost was made explicit on its already-published comment. Decision 16 neither accepts nor rejects the proposal, and its separate three-or-more-owner exemption gap is not evidence for it.
- **lead** (2026-10-03): Parents were reconciled after children. #64 closed not planned at 00:18:26Z after #36, #38 and #39; #65 at 00:18:31Z after #35 and #40. Both record `features_claimed: false`. #63 stayed open, reordered 59 then 54, with its module promise excluded under decision 15.
- **lead** (2026-10-03): Census is 21 open, 33 closed, 0 new, 0 reopened against the 54 baseline. The 33 closed are 25 implemented (Milestone 1) and 8 not planned (Milestone 2). No new capability was implemented; no product, decision or model file changed.
- **record writer** (2026-10-03): Card moved to review, not live. The mandatory Milestone 2 records gate has not run and no gate is claimed passed. The primary session owns that gate, landing and moving the card to done after it; the clean-code sweep is left to the coordinator's own quality check.

## Retrospective

Open issues fell from 29 to 21 with nothing new or reopened. Eight proposals were closed as not planned because current decisions 15 to 18 and the reference sources do not meet their recorded reopening conditions. Decision-backed exclusions reduce waiting work without claiming features: no capability was delivered, and the 33 closed count keeps 25 implemented and 8 not planned apart. The cost of each exclusion and a source-backed reopening condition stay on its issue comment, so a later source model can reopen it individually.

- **lead** (2026-10-03T00:37:40.943212+00:00): Accepted the eight completed quality lenses and independently verified the actual gate exit/log hash, clean unchanged candidate and all 21 remaining issues. Moved card to done after the real 4ccb76bb gate. This completion entry is a metadata delta; its final publication candidate must also pass the mandatory gate, with actual evidence kept outside the checkout. No new feature, review, issue post or closure is claimed.
