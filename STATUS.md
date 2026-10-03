# Status

## Goal / health

Clear the guarded ODS backlog. Milestones 1 and 2 are complete and their records published: 25 model issues delivered, eight proposals closed not planned, 20 issues remain from the 54-open baseline. Milestone 3 has delivered #103; PR #106 is next. No new capability is claimed for the proposal dispositions.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while Claude usage is available; it delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, goal management, acceptance and delivery. Coordinator effort defaults to medium and never exceeds high. Verify actual runtime models; do not silently substitute. On an actual Claude usage-limit response, immediately stop all Claude work and fall back to GPT-6 Luna for all lanes (coding, investigation and verification), archive the limit/reset and avoid repeated retries. The owner reports a 01:00 Europe/London reset; after reset, make one bounded attempt on the next useful task. If that single attempt fails, the Luna fallback is retained and the failure recorded, with no repeated retries.

The coordinator alone may dispatch Sonnet workers within the assigned batch; workers may not dispatch further. The coordinator must not expand or create new scope. Shared limits remain two coding lanes plus one validation lane across both vendors, disjoint ownership and one integration batch. Publication, issue closure and final-review dispatch remain with the primary session. Preserve accepted work when switching vendors. Astra Low remains exclusively the final whole-model gate after primary lead readiness; the existing model approval is retained, with no retrospective Claude review.

Durable restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`. This paragraph supersedes older execution-model defaults, while preserving historical evidence.

## Now

Milestone 3 delivered #103 through PR #133, merged as fe0df346. Its tree exactly equals gated candidate 88261767. The unmodified Node26 gate passed with 433 browser tests, 20 existing documented capture skips, 1,058 pages tests at 100% coverage, every other suite, exact model pins, schema and ESM checks. Thirty focused repeats and thirteen actual reader-host cases demonstrated stable released geometry. The first coverage gap was corrected with a mutation-sensitive fixed-map regression; source and host proof were retained. The live backlog is 20 open: 26 delivered and eight not-planned closures. Closeout records require their own clean gate before publication.

Milestone 2 records a647c6e0 passed their final unmodified gate and landed on develop; card 182 is done. Model approval remains historical e5cda126, with no new Astra request for UI/tooling.

## Next

Publish the verified #103 records, then rebase PR #106 onto that develop state. Preserve the drag fix and canonical model routing, assert intended pages, and remeasure current NorthBank 19-context fits across viewer/export/VS Code. Opus 5.5 coordinates Sonnet 5.5; builds, browsers and real hosts are serialized. Required #102 pre/post CI uses one explicit non-release run per final head where checks permit.

## Later

Finish diagram fitting after #103 lands, then follow the remaining milestone order. Remaining milestones and scope stay in the manifest and [roadmap](docs/bots/ROADMAP.md); no tooling or model-proposal implementation starts as part of this closeout.

## Outcomes / blockers

All 25 cards 157–181 are reconciled, marked done and non-live; the #108 parent was closed last after its child stories. Per-card journals cite the individual issue comments and merge/review evidence. The sprint retrospective records measured delivery results and the evidence-preparation lesson.

## Working state

Updated: 2026-10-03T03:18:02.575285+00:00. Worktree `/Users/jonathanturnock/.codex/worktrees/relationship-pages/open-domain-specification`; branch `codex/drag-check-103`; accepted merge `fe0df346d13afa7e5a69c66012ef9b0fe2023cb3`. Card 183 is done following actual gate, merge and issue closure. Closeout records are pending their clean gate and publication. PR #106 remains parked at `071ff573` in the cross-surface-fixture worktree. Durable CURRENT.json holds the current process and next assignment.
