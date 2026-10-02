# ODS delivery controls

## Authority and current truth

The owner accepted the ten-milestone plan and its controls on 2026-10-02. This document governs execution, not the model schema. `manifest.json` records every baseline issue exactly once, milestone state and actual closure evidence. STATUS is the current snapshot; ROADMAP is the delivery ledger; picked-up RepoDoc cards keep append-only work journals. Historical assertions do not override current source or exact-head evidence.

Target: all 54 baseline issues dispositioned honestly, all delivered changes merged, cards/epics reconciled and live GitHub backlog zero. New/reopened issues remain visible and cannot be omitted from the finish audit. Declined capability requests are not shipped features.

## Checkpoint and restart contract

Checkpoint at assignment, accepted finding, integration, candidate freeze, gate completion, review, merge and closure; at least hourly during sustained implementation. Include: timestamp, milestone/issues/owner, worktree/branch, clean/dirty state, candidate SHA, changed scope, criterion status, gate SHA/exit/log, reviewer SHA/verdict, remote/base/merged SHA, open/new/reopened/closed counts, blocker/resume condition and next executable action.

Archive prompts/reports/logs to `/Users/jonathanturnock/.codex/ods-delivery/milestone-NN/SHA/`. CURRENT.json points to the latest checkpoint, journal.jsonl is append-only. Archive summaries never imply a test was run. Exclude credentials/.env and private authentication material. Temporary files are working copies only.

While a candidate is frozen, journal running evidence outside its checkout. After landing, consolidate accurate summaries/archive references in the repository closeout records through mandatory verification. Any repo edit changes the candidate SHA; invalidate affected checks and obtain exact-head approval where required.

On restart: read STATUS, manifest and active card; verify cwd/branch/SHA/dirty files/live agents/processes; inspect actual remote PR/issues/base/merge; reconcile evidence with current product; resume recorded next action. Never repeat external posts/merges/closures without checking actual state. Preserve unrelated main-checkout work.

## Assignment and investigation controls

Lead owns design, integration, evidence acceptance, final reviewers, push/merge and closure. One integration batch at a time; at most two bounded coding assignments plus one validation assignment. Each brief names exact ownership, exclusions, acceptance commands and stopping point. Agents verify cwd/branch before mutation, preserve others and return evidence; no agent independently pushes, merges, closes issues, calls final reviewers or dispatches agents.

Each investigation starts with one question, a hypothesis and a falsifiable probe. After 30 active minutes without useful evidence, checkpoint and change the probe. After 60 active minutes without reproduction or justified conclusion, stop that approach: lead narrows it, delegates a specific question or records an external blocker. Running required gates/known productive implementation are not blind investigation time. Limits require reassessment, never ignoring a known defect or weakening acceptance.

Two unsuccessful corrections of the same defect class require a bounded subsystem assessment and revised acceptance matrix before more coding or final review. Classify every finding: current blocker, existing later issue, optional improvement or decision-backed exclusion. Distinct user outcomes may justify a new issue only with evidence and recorded count impact; ticket creation is not delivery. Adjacent corrections stay with existing stories.

## Verification and landing controls

Before final review: finite positive/negative source+JSON matrix complete, affected four-reader assertions, introduced quality findings resolved, generated outputs rebuilt, exact reference pins preserved, required tests/gate passed on clean committed candidate. Apply pre-commit/clean-code-review proportionally; never lower thresholds/skip failures. Actual VS Code tests and port 4173 browser/full gate are serialized.

Use Astra low / Claude Opus 5.5 high final reviewers only when lead is happy complete. Owner permits SOL coding and OpenAI-only final approval when Claude quota is exhausted; no false Claude signoff. Quota failures record availability/resume condition; no repeated retries on the same unavailable route. Use a different authorized available route once, then record actual outcome.

Evidence always names SHA. Old green gates and BLOCKs are history. An interrupted review has no verdict. Rerun checks only for a concrete changed risk or mandatory gate; once sufficiently verified, land. GitHub CI only where explicit acceptance or branch rules require it, on final candidates; no release.

Verify actual merged tree against approved candidate. Reconcile each story/card separately, then parent epics; no blind checkbox sweep or forged human approval fields. Current board doing-exit requires clean-code-swept=true; honor configured gates and owner-authorized closure. Required closeout-record commits pass the mandatory gate before push.

## Reporting and retrospective controls

At milestones: accepted closures, new/reopened, net open, criterion completed/pending, candidate/gate/reviewer/merge evidence and next exit gate. Tests/review rounds/drafted commits are not delivery. After blocked review or recurring gate failure, append five whys and one corrective action with owner, check its effectiveness next checkpoint. Daily active retrospective tracks oldest unlanded batch and review/gate/CI cost.

After two active hours with no criterion advancing, produce explicit stagnation checkpoint: attempted probes, learning, delivery blocker and changed approach. Milestone waiting due to quota is not silently reclassified complete; record resume condition. Completion audit: live GitHub census, every manifest row dispositioned with actual evidence, accurate cards/epics/STATUS, no hidden unfinished milestone, goal marked complete only then.

## Milestone guardrails and exits

| Milestone | Issues | Target open | Entry/scope | Exit proof | Investigation boundary |
| --- | --- | ---: | --- | --- | --- |
| 1. Finalise and land the model | #107, #108, #109, #110, #111, #112, #113, #114, #115, #116, #117, #118, #119, #120, #121, #122, #123, #124, #125, #126, #127, #128, #129, #130, #131 | 29 | Existing PR #132 only; model semantics and faithful four readers. No tooling or speculative expansion. | Explicit Astra low APPROVE, exact-head required gates, verified merged tree and individual 25 story/card reconciliation. | Each blocker needs a defect-class matrix and local proof before another final review. |
| 2. Resolve the model proposals | #35, #36, #37, #38, #39, #40, #64, #65 | 21 | Apply current decisions; reconcile #63 module promise while retaining #59 and #54. | Each not-planned disposition states retained cost, reopening condition and actual source evidence; parents reconciled last. | No implementation or new DDD debate without a recorded reopening condition being met. |
| 3. Diagrams and reliable drag checks | #102, #86, #89, #90, #103 | 16 | Existing PR #106 after model closeout; #103 separate PR if unrelated cause. | Measured inline/fullscreen fit, panel clearance, actual hosts and explained stable released-node geometry. | No geometry redesign, weakened assertions, blind sleeps or accepted rerun as flake repair. |
| 4. Readable tables | #105, #87, #88, #80 | 12 | Only prose sizing, intact type tokens and accessible identity-column name. | Actual before/after geometry across table callers/hosts; 24ch glossary, token integrity and accessible associations. | No general redesign, phone navigation, contrast or unrelated copy. |
| 5. Accessible reading | #78, #79, #83 | 9 | Named contrast failures, prose links and keyboard skip paths. | Both-theme measured contrast; underlined prose links; first-stop content skip and one-step diagram bypass with real keys. | No visual redesign outside failing tokens and specified interactions. |
| 6. Location and return paths | #91, #77 | 7 | Active tree row visibility and extension Back/Forward only. | Deep-link/load/route/reduced-motion visibility; pointer/key history states and heading focus. | No routing rewrite unless existing behavior concretely prevents acceptance. |
| 7. Phone reading | #82 | 6 | Page-first phone layout and accessible tree access. | All 9 reported families fit 390×844 without page-level horizontal overflow; desktop preserved. | Shared layout first; local exceptions only for measured residual failures. |
| 8. Import and copy finish | #92, #93, #94 | 3 | Import refinements and editorial slice independently accepted. | Themed native focus target, file name, Problems-style error and exact two copy corrections. | No import architecture rewrite or wording sweep; unrelated slices use separate PRs. |
| 9. Team-owned model files | #59 | 2 | Reconcile decision 08 with current decision 29 and settle identity/linking/diagnostics/persistence/reader packaging before code. | Split substantial reference model equivalent to single-file including pins; missing/ambiguous/cyclic refs, lossless owning-file save and four readers. | No modules, forms, independent crossing permissions or new expressiveness. |
| 10. Informed forms and authoring epic | #54, #63 | 0 | Forms consume accepted assembled-workspace resolver; epic #63 last. | Legal target options, stale choice diagnostics, own-file writes preserving unrelated edits and complete authoring journey. | No form-specific second resolver or independent model semantics. |

## Assignment template

BOT / OBJECTIVE / CURRENT HEAD / IN / OUT / OWNER FILES / ACCEPTANCE MATRIX / VERIFICATION / INVESTIGATION START / STOPPING POINT / RETURN: STATUS, DID, EVIDENCE, DECISIONS NEEDED, OUT OF SCOPE. Include resource reservations for hosts/browser gates. Lead approves specific evidence, not agent confidence.

## Initial checkpoint

2026-10-02T21:44:53Z: live 54 open / 0 closures; local d7d9d319 clean, base a0e88e97, remote PR #132 635bcc7e. d7 full gate exit 0 (core 1,568 / Pages 1,055 at 100% coverage / browser 431 passed, 20 documented skips), actual hosts 15 + 23 / checker passed. CLI final25 interrupted by usage limit: NO verdict, not a 25th BLOCK. Twenty-four completed BLOCK verdicts remain historical. Durable evidence archived before controls edit. New documentation-only freeze/gate needed; product source unchanged. No current review/merge/closure/CI claimed. In-app availability reports ordinary usage allowed; one architect Astra low route will be tried after new gate, not repeated CLI retries.
