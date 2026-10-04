# ODS backlog delivery roadmap

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while Claude usage is available; it delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, goal management, acceptance and delivery. Coordinator effort defaults to medium and never exceeds high. Verify actual runtime models; do not silently substitute. On an actual Claude usage-limit response, immediately stop all Claude work and fall back to GPT-6 Luna for all lanes (coding, investigation and verification), archive the limit/reset and avoid repeated retries. The owner reports a 01:00 Europe/London reset; after reset, make one bounded attempt on the next useful task. If that single attempt fails, the Luna fallback is retained and the failure recorded, with no repeated retries.

The coordinator alone may dispatch Sonnet workers within the assigned batch; workers may not dispatch further. The coordinator must not expand or create new scope. Shared limits remain two coding lanes plus one validation lane across both vendors, disjoint ownership and one integration batch. Publication, issue closure and final-review dispatch remain with the primary session. Preserve accepted work when switching vendors. Astra Low remains exclusively the final whole-model gate after primary lead readiness; the existing model approval is retained, with no retrospective Claude review.

Durable restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`. This paragraph supersedes older execution-model defaults, while preserving historical evidence.

## Current position — 2026-10-04

**Superseded at 2026-10-04T03:37Z by "Milestone 8 delivery" below: 3 open / 51 closed (43 implemented, 8 not planned, 0 new/reopened); open #63, #59, #54.** The paragraphs below are kept as dated snapshots.

Actual 4 open / 50 closed from 54: 42 implemented, 8 not planned, 0 new/reopened. Open: #94, #63, #59, #54. Milestones 1–7 delivered; exact original model approval (Astra e5cda126, merged 5a624128) unchanged. M5 PR135 merge f2069a34 matches gated f3ff556d tree, pre/postCI 37142462656/37142959185 all 3 jobs green, publish skipped, three individual closures; closing-record head 8606b282 passed its own unchanged gate and is published/remote verified.

M6 #91/#77 is delivered. Original PR136 (merge 5bfdb713, gated b757fd2e) passed the local gate and preCI 37152204246, but postCI 37152866652 failed its `test` job (one new App history-availability unit assertion; browser and native jobs green), so the issues stayed open. Corrective PR137 (one test, two records; gated c83ec6ef, local gate exit 0: 652 browser/20 baseline skips/0 flaky, 1283 pages tests/100% coverage) passed preCI 37154961207 and postCI 37155696421, all 3 jobs each, publish skipped; merge edbbbd7f (2026-10-03T21:36:26Z) has a tree identical to the gated head. #91 closed 21:46:24Z and #77 closed 21:46:28Z individually. Four necessary CI runs, two successful local source gates, no duplicate runs, no release, no quota response. Native 32 keyboard/0 failed/0 skips/checker 0; static 36, history 6, bypass 6; quality highest 0.4. The failure cause is a sufficient deadline-straddle mechanism reproduced under a controlled stall; the actual CI occurrence is unproven. Card186 done; see [retrospective 07](sprints/2026-10-03-retro-07.md).

**M6 records published:** clean `ef0a82eb` passed its own unmodified gate (181 s; 1283 pages/100%, 652 browser/20 existing baseline skips/zero flaky), and remote develop equals that head. **M7 source delivered:** #82 phone reading is closed as completed (00:58:54Z, comment 5975194249). Source candidate `d8e3c831` passed the unmodified gate on the first attempt (195 s; 1313 pages/100%, 665 browser/20 existing opt-in capture skips/0 failed, flaky or retried). PR138 merged as `7599eef8` (00:45:36Z) with a tree identical to the gated tree `292a756c`. Pre-merge CI 37165358953 and post-merge CI 37166004365 passed test/e2e/real-vscode on exact heads, publish skipped, no release. One source PR, one source gate, two necessary manual CI runs, no quota event. Card187 done; see [retrospective 08](sprints/2026-10-04-retro-08.md).

**M7 records published:** de8354b7 passed its own unmodified gate and remote publication. **M8 importer delivered:** PR139 identical gated/merged tree, exact pre/postCI success, #92/#93 individually closed. #94 copy reader outcome is accepted; complete outgoing quality and exact gate/CI/merge/closure remain pending. Then multifile and forms. Preserve source/model approval and all controls.

**Binding reviewer policy:** Astra low is the one final complete-model quality gate, only after lead review and explicit readiness. It is never a default or per-change reviewer. After a BLOCK, correct and locally verify the complete defect class before the lead declares readiness again. Claude weekly quota exhaustion activates the owner-authorized OpenAI-only exception for this final gate; no Claude approval is claimed. Preserve the actual reviewed SHA and require product-tree equivalence at merge.

| Milestone | Issues | Expected remaining | State |
| --- | --- | ---: | --- |
| 1. Finalise and land the model | #107, #108, #109, #110, #111, #112, #113, #114, #115, #116, #117, #118, #119, #120, #121, #122, #123, #124, #125, #126, #127, #128, #129, #130, #131 | 29 | complete: 25 individually accepted closures |
| 2. Resolve the model proposals | #35, #36, #37, #38, #39, #40, #64, #65 | 21 | complete: 8 not planned, records a647c6e0 published; #63 reconciled and open |
| 3. Diagrams and reliable drag checks | #102, #86, #89, #90, #103 | 16 | complete: all five individually accepted closures; records 000f5a7f gate-green and published |
| 4. Readable tables | #105, #87, #88, #80 | 12 | complete: four closures and gate-green published records |
| 5. Accessible reading | #78, #79, #83 | 9 | complete: three closures; own-gated closing records8606b282 published |
| 6. Location and return paths | #91, #77 | 7 | complete: PR137 merged edbbbd7f, two individual closures; closing records ef0a82eb published |
| 7. Phone reading | #82 | 6 | complete: source delivered; closing records de8354b7 own-gated and published |
| 8. Import and copy finish | #92, #93, #94 | 3 | complete: PR139 and PR140 delivered, three individual closures; closing records pending their own gate and publication |
| 9. Team-owned model files | #59 | 2 | waiting: not activated; flat design rejected, bounded contract correction needed before source |
| 10. Informed forms and authoring epic | #54, #63 | 0 | waiting: starts with an intentional complete add/update authoring inventory |

## Milestone 1 delivery retrospective (2026-10-02)

The 54-open baseline became 29 open / 25 closed, with zero new and zero reopened issues. One bounded construction-order refusal correction followed the prior BLOCK; focused source/JSON proof and the clean exact-head gate preceded one final Astra low APPROVE. The team then verified the merged tree against the reviewed tree and closed all 25 stories individually, with #108 last. No remote CI run was needed or made.

The gate-before-review and exact-SHA controls were effective: the final review inspected the same product tree that passed the local gate and later merged. The bounded defect-class correction avoided treating an earlier green gate or diagnostic-free model as sufficient proof. Four-surface evidence includes generic real VS Code host coverage; it does not claim a dedicated NorthBank Money journey.

An evidence-preparation retrospective outside the repository records that ignored generated outputs were mistaken for absent files and an old PR draft carried stale helper paths/ranges. Those errors were caught before publication. The control is to derive acceptance references from the current packet, verify paths in the actual checkout (separately recording ignored/generated provenance), and omit stale ranges unless freshly checked. That retrospective is retained at `/Users/jonathanturnock/.codex/ods-delivery/milestone-01/e5cda126/evidence-retrospective.md`.

## Milestone 2 disposition retrospective (2026-10-03)

Open issues went from 29 to 21 with zero new and zero reopened. Eight proposals (#35–#40, #64, #65) were closed as not planned, each with a published comment stating its retained cost and source-backed reopening condition; #64 and #65 closed after their children and no feature is claimed. #63 stays open, ordered #59 then #54, with its module promise excluded under decision 15. Decision 16 neither accepts nor rejects #39. Decision-backed exclusions reduced waiting work without delivering capability: they are not implemented features, and the closed count of 33 is 25 implemented plus 8 not planned. The ledger is `/Users/jonathanturnock/.codex/ods-delivery/milestone-02/disposition-execution/actions.jsonl`.

## Milestone 3 delivery retrospective (2026-10-03)

Open issues went from 21 to 16 with five implemented closures, no new/reopened issues. #103's production drag correction landed separately; PR #106 delivered the three fit children and parent #102. Exact final local gate, current host evidence, independent quality, pre/post CI and merged-tree equality preceded the individual closures.

The main delay was test readiness. The first CI failed target room before dragging; pan correction then entered the left auto-pan zone. A geometry wait assumed style selection would request a refit, which the source and Linux trace disproved. Two bounded subsystem assessments changed the acceptance axis: one real Fit View request, after geometry settles, followed by explicit containment/room/path checks, tested from natural and controlled-bad starting poses with the same scenario body and original tolerances. Final Linux pre/post CI passed, verifying that control for this environment without claiming a universal fault rate.

The [full retrospective](delivery/retrospectives/2026-10-03-milestone-03.md) records the actual gate/CI attempts and the guardrail for M4. No extra Astra review, model reopening or new ticket substituted for delivery.

## Milestone 6 delivery retrospective (2026-10-03)

Open issues went from 9 to 7 with two implemented closures (#91, #77), no new/reopened issues. The original merged PR failed one new unit assertion post-merge while browser and real-VS-Code jobs passed; closures were held and a corrective test-only PR137 was gated, merged with an identical tree, verified by pre/post CI, and only then were the issues closed. The failure mechanism is reproduced under a controlled stall; its actual CI occurrence is unproven. The [full retrospective](sprints/2026-10-03-retro-07.md) records actual failures, process errors and limits. No Astra review, Claude retrospective approval, release or new ticket.

## Milestone 7 delivery retrospective (2026-10-04)

Open issues went from 7 to 6 with one implemented closure (#82), no new or reopened issues; cumulatively 48 closed (40 implemented, 8 not planned) from the 54 baseline. One source PR (#138), one unmodified source gate, and two necessary manual CI runs, both successful with publish skipped. The records' own gate is additional and pending. The [full retrospective](sprints/2026-10-04-retro-08.md) records what was productive, what was inefficient and the process limits. The four native prose witnesses are old-bundle measurements retained by unchanged CSS, RefList and embedded source, not new-bundle measurements. No Astra review, release or new ticket.

## Milestone 8 activation — 2026-10-04T01:27:12.592019+00:00

M7 closing records `de8354b7ba28c371bdd60242e4473dd404ecbb5c` passed their own unmodified gate (227 s; 1313 pages/100%, 665 browser/20 existing captures/zero failed or flaky) and are published/remote verified. This supersedes the earlier pending checkpoint without rewriting its history. Six open issues remain. M8 begins with importer #92/#93 baseline only; implementation waits for root acceptance of four width/theme cells and finite acceptance matrix. #94 remains a separate copy PR. Opus/Sonnet execute, Luna only on actual quota; root owns goal/acceptance/publication. No source changes yet.

## Milestone 8 delivery (2026-10-04)

Open issues went from 6 to 3 with three implemented closures (#92, #93, #94), no new or reopened issues; cumulatively 51 closed (43 implemented, 8 not planned) from the 54 baseline. Open: #63, #59, #54.

- **Importer, PR139** (#92/#93): source `23c281af`, unmodified gate 190 s (1323 pages/100%, 689 browser, 20 existing opt-in baseline skips, 0 failed/flaky/retried), merge `af913078` with a tree identical to the gated tree `f1991f8f`. Pre/post CI 37170929768/37171695891 succeeded (test/e2e/real-vscode; publish skipped). #92 closed 02:50:38Z and #93 02:50:41Z.
- **Copy, PR140** (#94): source `fe7e59e8`, unmodified gate 190 s (same counts), merge `a7552b96` with a tree identical to the gated tree `1b76924e`. Pre/post CI 37173478992/37174063275 succeeded; #94 closed 03:34:52Z after the post-merge run.
- Cost: two source PRs, two source gates, four necessary manual CI runs, no automatic duplicate runs, no release, no quota response, no Astra review. The closing records' own quality, clean-head gate and publication are additional and pending (root). The model approval is unchanged (Astra e5cda126, merge 5a624128); no new UI approval is claimed. Full account and limits: [retrospective 09](sprints/2026-10-04-retro-09.md). Card 188 and card 189 are done.

**Next, with no claim beyond what is recorded.** M9 (#59) is not activated. The read-only survey's facts are accepted, but root rejected the flat one-workspace design: decision 08's linked complete workspace files and the duplicate-local-id identity counterexample require a bounded contract correction, accepted by root, before any source. No M9 design is approved. For #54 the survey's "current commands none" is a premise gap, not scope zero or vacuous completion; M10 starts with an intentional, complete add/update authoring inventory. No card or ticket is opened for either.

## Historical roadmap and retrospective records

The following dated snapshots are retained as history; the current ledger above supersedes their readiness/count claims.

# Roadmap

Kept by the lead. Milestones in order, with why. Work items are RepoDoc cards under `boards/`; engineering decisions are records under `decisions/` (the repo's existing ADR stream, not a second one here).

## Historical delivery sequence (2026-10-01)

Epics #96, #100 and #98 landed in sprint 03. The owner now puts model finality and independent signoff ahead of tooling. [Sprint 04](sprints/2026-10-01-sprint-04.md) integrates the model corrections on `codex/model-fidelity-northbank`, proves the validator's timing and causal reach across all four readers, runs the full local gate and requests one final exact-head Astra low review followed by Claude Opus 5.5 high only after local readiness. The model PR then lands on `develop` and closes its covered stories. Parked diagram PR #106 resumes only after that signoff and landing. The identity and reference-heavy capability epics #63 to #65 remain later and must not run together.

## 1. Intent and evidence (shipped, 0.3.0)

Comments and dispositions on strategic intents; relationship pages; health report; map disclosure; skill reconciliation. RFC-002.

## 2. Design language v2 (shipped, 0.3.0 and 0.4.0)

Every page follows the VS Code UX guidelines; v1 removed; modal relationship detail; Playwright gates CI.

## 3. The metamodel survives external review (sprint 04)

Goal set by the human on 2026-09-06: the model gives a correct, clean and detailed account of software systems the DDD way. Sprint 02 established the decisions and five reference models. Sprint 04 closes the accumulated model corrections as one locally verified batch, then seeks independent approval on one exact head and lands it. Review blockers return to a bounded local causal audit before another final review. Why: the model and its four readers must agree, and deliberate omissions must read as decisions with testable reopening conditions.

## 4. Diagram tooling and parked PR #106 (after model landing)

Rebase and verify PR #106 against the landed model. Review its integration diff, run the full local gate and real VS Code checks before landing. Only then begin another small tooling batch.

## 5. Finish bounded reader outcomes (after diagram landing)

Land one package before starting the next, with at most two implementation stories and one bounded audit active. First epic #105 with #87, #88 and #80: readable glossary and attribute columns, intact type tokens and an accessible identity header. Then #78, #79 and #83: readable contrast, recognizable prose links and a keyboard path past navigation and diagrams. Then #91 and #77: keep the current tree location visible and provide a return path inside the extension. Define the input and host matrix before implementation, capture the current baseline, and verify viewer, static export and the real extension where host behavior matters; Markdown must still tell the same model truth.

Keep phone navigation #82 separate because its layout needs an explicit design across page families. Viewer import refinements #92–#93, exact copy #94 and drag-check reliability #103 retain their own acceptance. Fix a reproduced unreliable landing gate under #103 rather than accepting reruns as stability evidence.

Measure merged issue closures, new/reopened issues, first-review acceptance and gate/CI cost at each delivery boundary; perform a five-whys assessment after a blocked final review and a daily retrospective. The observed 54-open baseline includes 25 model issues. Closing all 25 after verified model landing would leave 29; diagram landing would close four more. These counts are conditional, not closure evidence.

## 6. Modular workspaces (later)

Decision 08's `WorkspaceSet` was never implemented; extension card 07 covers it. Model corrections and bounded reader batches land first so the loader starts from a consistent base. In epic #63, resolve multi-file identity, ownership and references under #59 before workspace-aware forms #54. Reopen capability proposals #35–#40 only on their recorded source-backed conditions; do not dispatch the overlapping epics #63–#65 together.

## 7. Older extension cards

Extension cards 01, 02, 04, 06, 09 predate the team way of working and need scoping with the human before dispatch.

## Delivery retrospective after the twenty-second blocked model review

Observed on 2026-10-01: 54 open issues, 25 model stories awaiting one merged signoff batch, zero merged model closures. The green gate on `39a33ad3` preceded a reproduced loss of a process ending in the flow projection. A bounded local audit then found two distinct local/borrowed refusal schemas serialized as one answer reference. Both source and reconstructed models validated with zero diagnostics. Neither the old gate nor diagnostic absence establishes a lossless model round trip.

Five whys: final review found a missing semantic combination; the gate passed because that combination was absent from its cases; local matrices followed the latest helper/path rather than the whole input-to-reader contract; final signoff became the integration probe; a large unmerged batch accumulated review evidence without accepted closures. The first three are supported by concrete regressions; the last two are process inferences, and will be tested by the next delivery outcomes.

Owned controls for the next checkpoint:

- **Lead:** declare one bounded contract matrix before signoff: authored input and JSON, equal local/display ids with different full identities, actual route ownership, lifecycle role, duplicate controls, validator result and every affected reader. A bounded independent audit checks its missing axes; it finishes before the full gate and final reviewers.
- **Integration lead:** keep one current evidence block with local candidate, clean/dirty state, gate head/result, reviewer head/verdict and remote PR head. Historical evidence stays in journals. Source changes invalidate current gate and approval claims.
- **Delivery lead:** finish PR #132, verify the actual merged diff against each of the 25 acceptance-ledger rows, and close only proven stories. Then land PR #106 before opening the next reader package. Keep the two-implementation/one-audit work limit and use existing tickets for adjacent corrections.
- **Lead:** after a blocker, record its omitted axis and one owned process correction; verify that correction at the next checkpoint. Report merged-and-accepted closures, new/reopened issues, net burn-down, first-review acceptance and local/remote verification cost. Do not count tests, review rounds or conditional closure forecasts as shipped work.

These controls serve model trust now and the plugin later: `WorkspaceSet` and forms will need the same lossless identity/reference contract. They do not approve the current candidate or replace the mandatory landing gate.

## Twenty-third review correction (2026-10-01T20:52:23Z)

The existing model package now includes a complete reference identity contract, because ambiguous canonical refs changed an answer silently through JSON. Core, readers and guidance are delegated as three disjoint subsets; the lead integrates them against a finite producer-to-reader identity matrix. This supports the model now and multi-file authoring later without beginning plugin tooling. A separate iterative shared flow walk already passes its bounded source/JSON scale and ordering cases. No new backlog ticket is needed. The owner’s Claude-quota fallback uses SOL coding and OpenAI-only final approval until the quota resets. Current outcome remains zero merged model closures; implementation evidence does not count as burn-down.

Model checkpoint 2026-10-01T22:21:03Z: final24 BLOCK on ad6 after fullgate. Existing108 now covers complete shared-language separation intersections and bounded malformed-ref structural resolution. Two disjoint SOL lanes; model-first priority unchanged, no new backlog/CI/tooling start. Next final25 only after full class proofs and clean gate.

## Final24 integration readiness (2026-10-01T22:36:01Z)

Both final24 correction classes are integrated. Root full-core suite passes 1,568/1,568; independent reviewer artifacts now report one exact separate-ways diagnostic each, and the 78,029-character malformed external ref loads with one unresolved-ref and survives serialization unchanged. New 21-case borrowing matrix proves source/JSON exact negatives, fully clean permitted twins and permission contradictions; two resolver regressions prove short/deep invalid structures without recursion. All eight scoped quality reports /tmp/ods-final24-quality-*.md are clear by static inspection, read and reconciled by lead; no introduced finding above0.5. Core/graphviz/doc/skill and all five reference outputs/fixture regenerated; skill154, allfive48/shared13 and Biome/diff pass. Reference pins unchanged0/2/4/3/0; no pin or DISCOVERY edits. Card exits doing to review with clean-code-swept true. Fresh actualhosts, unmodified clean committed-head whole gate and final25 remain pending; old ad6 evidence is historical. Zero closures/newtickets/CI.

- 2026-10-04T01:37:06.626987+00:00: M8 importer actual four-cell baseline rootaccepted. Bounded one source/test lane authorized, localstaticbutton tokens with existing theme/contrast contract; no globalrestyle. Problems reference read-only. Preserve nativefocus/load/errorannouncements/phone/navigation; automatefilechooser and cancellation/reset state with limits explicit. #94separatePR. Evidence `/Users/jonathanturnock/.codex/ods-delivery/milestone-08/importer/baseline/root-acceptance.json`.

- 2026-10-04T02:06:21.647656+00:00: M8 importer #92/#93 reader outcome rootready for one complete10pathquality. Caption font compared with actual Load/URL, one returned mismatch corrected;1323unit100/check0/0/current24browser/root24/fouractualcells, allfourcaptures inspected collectively. Prior127focusedpass explicit103unaffected retained; nativefilechooser/resetstate proof no trueOScancel/samefilededupe claim. Completequality, exactwholegate/CI/merge/closures pending. #94copy separatePR. Evidence `/Users/jonathanturnock/.codex/ods-delivery/milestone-08/importer/font-correction/root-acceptance.json`.

## Current M8 checkpoint — 2026-10-04T02:54:19.462022+00:00

Importer PR139 delivered: gated23c281af, identical mergeaf913078; pre/postCI37170929768/37171695891 all required jobs success, publish skipped. #92/#93 closed individually, actual4open/50closed (42implemented,8notplanned,zero new/reopened). M7 closing records de8354b7 own-gated/published. #94 separate branchcodex/m8-copy now baseline accepted; RefList comma-space and ConsumablePage contents label only, existing list assertion strengthened. No ConsumesTable expansion/new ticket. Actual desktop anchor proof; narrow contents hidden. Opus5.5medium→Sonnet5.5 foreground, root delivery; no quota/Astra. Exact candidate quality/local whole gate/prepostCI remain pending.

## M8 records published / M9 contract activation — 2026-10-04T03:59:54.750456+00:00

M8 complete: closingrecords5120fd54 own unmodified gate188s,1323pages100/689browser20existingcaptures/zero failed/flaky/retried; remote develop verified. This supersedes earlier pendingrecord snapshots. Three open59/54/63,51closed43implemented8notplanned0new/reopened. M9#59picked: reuse acceptedsource map, correct rejectedflatdesign toward current08completeworkspaces/current29diagnostics/repeatedlocalididentity. Finite sharedcontract/owningwrite/all4reader matrix before source; no M9design/sourceapproval or newreviewclaimed. #54completeauthoringinventory and63wholepromiseaudit follow.

## M9 contract accepted / core implementation — 2026-10-04T04:33:54.379237+00:00

Three issues remain. #59 now has an accepted finite linked-workspace contract, an exact rule/carrier inventory and explicit runtime acceptance. One bounded core foundation lane starts before readers and forms consume its APIs. Local IDs remain workspace-scoped; set keys remain stable as files join or leave. Nested sibling references use a canonical encoded path resolved inside the explicit set root. No new permissions, modules, shared assets or compatibility machinery. Historical final model approval remains tied to its exact M1 head; a new final whole-model gate is reserved for complete model implementation and root readiness. All four readers and the actual NorthBank team split remain required.

## A0 foundation accepted / A1 core — 2026-10-04T04:57:42.272104+00:00

The actual foundation is accepted: source-local and qualified resolution, complete workspace ownership, cardinality-independent set keys and composite identities. Root caught a valid Unicode filename alias after 1,713 green tests; the bounded correction preserves U+FEFF in every path segment, passes 1,721 core tests and five fresh-build root probes. Existing malformed-UTF-8 refusal remains. Core JSON loading/dumping, qualified-invalid retention, set diagnostics, rule scope and derived readers are not yet delivered. One core lane proceeds before dependent hosts consume the JSON API. Final model review remains reserved for complete implementation/checks and root readiness; no reviewer or CI was used here.

## A1 accepted / next bounded lanes — 2026-10-04T05:41:31.160877+00:00

Core linked JSON, set-aware diagnostics/rules/maps/getters and raw qualified-invalid retention are accepted within this stage: 2,330 core tests and actual type/format/build/coverage, five unchanged model suites, root fresh-build exact JSON baseline replay. Preserve failed/aborted probes and generated drift. Opus 5.5 coordinates Sonnet 5.5 persistence and twelve-team NorthBank work next, with disjoint ownership and serial builds; hosts shape-check fresh inputs. Four-reader/native/doc agreement and complete-candidate final gates remain pending. No tickets, review or CI added.

## B accepted / all readers and plugin surfaces next — 2026-10-04T06:44:35.168213+00:00

Actual Opus5.5/Sonnet5.5 terminal/end-turn proof: writer163/type/format, ten native checks; NorthBank51/type/format/build/deterministicregeneration. Root independently proved owner-only retention and refusals plus12file/19context/34relationship exactpin/JSONreload; frozen originalbytes and DISCOVERYprefix intact. Accept scoped work, keep59open. Deterministic host file order, no schema orderhint; aggregated ordering/8position tables may differ with file order and remain explicit. Disk/editor/dependency races documented, no atomicclaim. Teammodules explicitly choose downstream declaration; existingDSLhelpers upstreamplacement documented, no adjacent rewrite. C1 real pages/extension/viewer/static adapters and C2 real Graphviz/Markdown/skill/docs/decisions/sharedconsumers next. Frozen monolith forstandalone regressions only; no stopgap replacing actual set coverage. Full quality/final whole-model/landing/necessaryCI remain reserved.

## M9 C checked / D integration — 2026-10-04T09:09:37.829011+00:00

C1 readers and C2 diagrams/Markdown/skill/docs completed and independently checked within ownership. Keep #59/#54/#63 open. D1 closes native report guard and README/discovery/history gaps; D2 regenerates outputs and proves other-model doc order/normal import map contents. Opus5.5medium delegates sequential foreground Sonnet5.5; actualquota Luna fallback. Source remains one candidate, no partial finalreview or CI. Full eight-lens quality only after D source complete, root wholemodel readiness then final model signoff/exact gates/publication. Current e5c/5a6 approval remains historical.


### M9 complete-source checkpoint — 2026-10-04T09:46:38.004847+00:00

C and D source/integration reports are complete. E2 corrected the normal-generator content agreement tests; root independently reran shared28/28. All five schema copies are generated and current, NorthBank remains12files with exact three diagnostic tuples, and ordinary packaged ESM/CJS produce214files/19contextnodes/37edges/420cross-filelinks. The DSL-versus-JSON consumption sequence cost is pre-existing at5120fd54; the earlier stale-artifact/candidate-order attribution is withdrawn. M9/#59 remains open: whole eight-lens source quality, clean-head landing gate, final whole-model signoff, native acceptance/necessary exact CI and publication are pending. No final Astra review has been requested. #54 real forms and #63 parent audit remain after #59.


### M9 final-source acceptance — 2026-10-04T10:29:33.546860+00:00

Whole-source eight-lens F is complete. G corrected actual diagnostic location/wording, malformed URL feedback and host-scoped navigation claims, with owning core2334/extension207/pages1541 green,100%pages coverage/types/format. Root replayed locate34 andURL39. Source accepted for freeze; no model final-review or delivery claim. Next exact clean-head unmodified gate, serial current native/keyboard, then root readiness/final model signoff, required exact pre/postCI and merge. Three issues remain.


### M9 mandatory precommit corrections accepted — 2026-10-04T11:04:11.646799+00:00

H shared relationship grouping in packages/core/src/relationship.ts:85 preserves662 generated files and162 page rows; core2339/doc106/pages1541 green. I removes duplicated typography in packages/pages/src/lib/organisms/PageHeader.svelte:54 while preserving868 actual browser measurements, with a real failed spacing mutation and13focused browser tests. Both actual canonical foreground Sonnet5.5 end-turns and terminal Opus5.5 checks retained. Numeric score scan now finds0markers. Old regex missed0.55; five-whys/control saved outside repository. Candidate94897c24 was never pushed or gated; final correction freeze and unmodified wholegate are next. Native/current-candidate acceptance, final-model reviews, CI, merge and59closure remain pending. Low-score optional advisories declined; no newtickets or scope.
