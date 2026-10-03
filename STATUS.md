# Status

## Goal / health

Clear the guarded ODS backlog. Milestones 1 and 2 are complete and their records published: 25 model issues delivered, eight proposals closed not planned, 20 issues remain from the 54-open baseline. Milestone 3 has delivered #103; PR #106 is next. No new capability is claimed for the proposal dispositions.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while Claude usage is available; it delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, goal management, acceptance and delivery. Coordinator effort defaults to medium and never exceeds high. Verify actual runtime models; do not silently substitute. On an actual Claude usage-limit response, immediately stop all Claude work and fall back to GPT-6 Luna for all lanes (coding, investigation and verification), archive the limit/reset and avoid repeated retries. The owner reports a 01:00 Europe/London reset; after reset, make one bounded attempt on the next useful task. If that single attempt fails, the Luna fallback is retained and the failure recorded, with no repeated retries.

The coordinator alone may dispatch Sonnet workers within the assigned batch; workers may not dispatch further. The coordinator must not expand or create new scope. Shared limits remain two coding lanes plus one validation lane across both vendors, disjoint ownership and one integration batch. Publication, issue closure and final-review dispatch remain with the primary session. Preserve accepted work when switching vendors. Astra Low remains exclusively the final whole-model gate after primary lead readiness; the existing model approval is retained, with no retrospective Claude review.

Durable restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`. This paragraph supersedes older execution-model defaults, while preserving historical evidence.

## Now

Milestone 3 has delivered #103 and published its gated records f06b8484. Frozen PR #106 source 8ac154c5 preserves that correction. Its current NorthBank diagram matrix passed 168 host cases across actual VS Code, viewer and HTTP/file exports; keyboard 24 and focused real-webview drag passed. Standard candidate VS Code invocation 7 failed four ready/navigation assertions in one launch. Baseline standard passed 16; diagnostic candidate petstore passed nine, neither reproducing the failure. Cause remains unproven. Invocation11 passed all 16 standard tests with four allowed capture skips using CI profile isolation; combined checker exit0 retains unchanged-source keyboard24. Root accepts host evidence and the completed eight independent Sonnet 5.5 principles under Opus 5.5 coordination; no introduced finding exceeds 0.5 (highest 0.4). Source stays frozen. Clean final landing gate and necessary CI remain outstanding. Twenty issues remain.

Milestone 2 records a647c6e0 passed their final unmodified gate and landed on develop; card 182 is done. Model approval remains historical e5cda126, with no new Astra request for UI/tooling.

## Next

Run unmodified Node26 verify-all on the clean quality-accepted candidate, then publish its exact head for required pre-merge CI. Required pre/post test/e2e/real-vscode CI stays limited to one explicit non-release run per final head. Existing host geometry and keyboard evidence remains valid for unchanged source.

## Later

Finish PR #106 diagram fitting, then follow the remaining milestone order. Remaining milestones and scope stay in the manifest and [roadmap](docs/bots/ROADMAP.md); no tooling or model-proposal implementation starts as part of this closeout.

## Outcomes / blockers

All 25 cards 157–181 are reconciled, marked done and non-live; the #108 parent was closed last after its child stories. Per-card journals cite the individual issue comments and merge/review evidence. The sprint retrospective records measured delivery results and the evidence-preparation lesson.

## Working state

Updated: 2026-10-03T04:46:01.610709+00:00. Worktree `/Users/jonathanturnock/.codex/worktrees/cross-surface-fixture/open-domain-specification`; branch `codex/epic-102-diagram-fit`; rebased head `8ac154c5405d9804288149c9b0f948b936e1a2e7`; base `f06b8484`. Card 156 is doing for current integrated acceptance; historical proof remains in its append-only journal. Card 183 is done. The source is frozen for validation; records are not yet a landing candidate. Durable CURRENT.json tracks the actual coordination process and scope.
