# Status

## Goal / health

Clear the guarded ODS backlog. Milestones 1 and 2 are complete and their records published: 25 model issues delivered, eight proposals closed not planned, 21 issues remain from the 54-open baseline. Milestone 3 is active, starting with #103 before PR #106. No new capability is claimed for the proposal dispositions.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while Claude usage is available; it delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, goal management, acceptance and delivery. Coordinator effort defaults to medium and never exceeds high. Verify actual runtime models; do not silently substitute. On an actual Claude usage-limit response, immediately stop all Claude work and fall back to GPT-6 Luna for all lanes (coding, investigation and verification), archive the limit/reset and avoid repeated retries. The owner reports a 01:00 Europe/London reset; after reset, make one bounded attempt on the next useful task. If that single attempt fails, the Luna fallback is retained and the failure recorded, with no repeated retries.

The coordinator alone may dispatch Sonnet workers within the assigned batch; workers may not dispatch further. The coordinator must not expand or create new scope. Shared limits remain two coding lanes plus one validation lane across both vendors, disjoint ownership and one integration batch. Publication, issue closure and final-review dispatch remain with the primary session. Preserve accepted work when switching vendors. Astra Low remains exclusively the final whole-model gate after primary lead readiness; the existing model approval is retained, with no retrospective Claude review.

Durable restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`. This paragraph supersedes older execution-model defaults, while preserving historical evidence.

## Now

Milestone 3 is active, starting with #103 as a separate drag repair before PR #106 integration. Opus 5.5 coordinated Sonnet 5.5; both runtime identities are confirmed. The final free-map extent correction and drag-cache synchronisation passed 30 focused repeats, the four-test tracked suite and 13 actual viewer/export/VS Code cases. All eight quality principles are clear after a comment-only coupling recheck. Earlier measured-cache passes are historical; the earlier visible catch-up interpretation is superseded by the full state-contract evidence. The first clean landing gate found the new fixed-map guard lacked unit coverage. A non-vacuous real-drag test now preserves all fixed-map cluster styles and fails when that guard is removed; 1,058 pages tests pass with 100% coverage. Production and e2e files are unchanged by this correction. The corrected candidate requires the full landing gate. The backlog remains 21 open.

Milestone 2 records a647c6e0 passed their final unmodified gate and landed on develop; card 182 is done. Model approval remains historical e5cda126, with no new Astra request for UI/tooling.

## Next

Freeze the accepted #103 candidate, run the clean unmodified Node26 landing gate, then publish and merge its separate PR before closing the issue. Rebase PR #106 onto the accepted develop state; correct canonical route navigation and assert intended pages, then remeasure current NorthBank 19-context fits across viewer/export/VS Code. Serialize builds, browsers and real hosts. Necessary pre/post CI for #102 is conserved through one explicit non-release run per final head where branch checks permit.

## Later

Finish diagram fitting after #103 lands, then follow the remaining milestone order. Remaining milestones and scope stay in the manifest and [roadmap](docs/bots/ROADMAP.md); no tooling or model-proposal implementation starts as part of this closeout.

## Outcomes / blockers

All 25 cards 157–181 are reconciled, marked done and non-live; the #108 parent was closed last after its child stories. Per-card journals cite the individual issue comments and merge/review evidence. The sprint retrospective records measured delivery results and the evidence-preparation lesson.

## Working state

Updated: 2026-10-03T03:05:41.463361+00:00. Worktree `/Users/jonathanturnock/.codex/worktrees/relationship-pages/open-domain-specification`; branch `codex/drag-check-103`; base `a647c6e056c676a3c88aca93dd1f45b58c5985ea`. Card 183, STATUS and manifest record the accepted source and quality evidence. No landing gate, merge or issue closure is claimed yet. Durable CURRENT.json records the completed coordinator and next action.
