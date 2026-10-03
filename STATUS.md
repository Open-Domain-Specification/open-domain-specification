# Status

## Goal / health

Clear the guarded ODS backlog. Milestones 1 and 2 are complete and their records published: 25 model issues delivered, eight proposals closed not planned, 20 issues remain from the 54-open baseline. Milestone 3 has delivered #103; PR #106 is next. No new capability is claimed for the proposal dispositions.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while Claude usage is available; it delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, goal management, acceptance and delivery. Coordinator effort defaults to medium and never exceeds high. Verify actual runtime models; do not silently substitute. On an actual Claude usage-limit response, immediately stop all Claude work and fall back to GPT-6 Luna for all lanes (coding, investigation and verification), archive the limit/reset and avoid repeated retries. The owner reports a 01:00 Europe/London reset; after reset, make one bounded attempt on the next useful task. If that single attempt fails, the Luna fallback is retained and the failure recorded, with no repeated retries.

The coordinator alone may dispatch Sonnet workers within the assigned batch; workers may not dispatch further. The coordinator must not expand or create new scope. Shared limits remain two coding lanes plus one validation lane across both vendors, disjoint ownership and one integration batch. Publication, issue closure and final-review dispatch remain with the primary session. Preserve accepted work when switching vendors. Astra Low remains exclusively the final whole-model gate after primary lead readiness; the existing model approval is retained, with no retrospective Claude review.

Durable restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`. This paragraph supersedes older execution-model defaults, while preserving historical evidence.

## Now

Milestone 3 has delivered #103. PR #106 product source, 168 actual-host cases and full product quality remain accepted. Initial39e2f334 local gate passed; necessary pre-merge CI failed one pre-drag space guard. The first test-only pan correction27e83b8f then failed the clean736b1395 local gate with held camera drift7.875 (484 browser cases passed,20 documented skips; units/coverage/schema/ESM/pins passed). The bounded Opus5.5/Sonnet5.5 assessment reproduced that exact drift10/10: the setup pan moved the grab into the left40px auto-pan zone. A replacement test-only setup waits for fitting geometry, uses real zoom controls and guards the entire pointer path. Thirty ordinary drag checks passed; the combined diagnostic invocation exited1 with20 diagnostic harness failures, so corrected gate-start acceptance is explicitly pending. Eight-principle delta review is accepted (no required changes); no further CI or publication yet. Twenty issues remain.

Milestone 2 records a647c6e0 passed their final unmodified gate and landed on develop; card 182 is done. Model approval remains historical e5cda126, with no new Astra request for UI/tooling.

## Next

Freeze one clean candidate and run unmodified Node26 verify-all once as the gate-start proof. Publish only on gate0 and clean exact head, then run necessary exact-head non-release pre/post CI. Retain all failed attempts; no unchanged-head CI reruns. Existing host geometry and keyboard evidence remains valid for unchanged product source.

## Later

Finish PR #106 diagram fitting, then follow the remaining milestone order. Remaining milestones and scope stay in the manifest and [roadmap](docs/bots/ROADMAP.md); no tooling or model-proposal implementation starts as part of this closeout.

## Outcomes / blockers

All 25 cards 157–181 are reconciled, marked done and non-live; the #108 parent was closed last after its child stories. Per-card journals cite the individual issue comments and merge/review evidence. The sprint retrospective records measured delivery results and the evidence-preparation lesson.

## Working state

Updated: 2026-10-03T06:04:12.703029+00:00. Worktree `/Users/jonathanturnock/.codex/worktrees/cross-surface-fixture/open-domain-specification`; branch `codex/epic-102-diagram-fit`; product `8ac154c5`; failed local candidate `736b1395`; remote PR head `39e2f334`; base `f06b8484`. Only test setup and these delivery records are changing. Card156 doing;183 done. Durable CURRENT.json tracks the actual coordinator process; historical journals remain append-only.
