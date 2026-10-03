# Status

## Goal / health

Clear the guarded ODS backlog. Milestone 1 is complete: PR #132 is merged and its 25 model stories were accepted and closed individually. Milestone 2 dispositions are complete, with its record gate pending. The issue census is 21 open, 33 closed, zero new and zero reopened against the 54-open baseline. The 33 closed are 25 implemented (Milestone 1) and 8 closed not planned (Milestone 2); no new capability was implemented.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while Claude usage is available; it delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, goal management, acceptance and delivery. Coordinator effort defaults to medium and never exceeds high. Verify actual runtime models; do not silently substitute. On an actual Claude usage-limit response, immediately stop all Claude work and fall back to GPT-6 Luna for all lanes (coding, investigation and verification), archive the limit/reset and avoid repeated retries. The owner reports a 01:00 Europe/London reset; after reset, make one bounded attempt on the next useful task. If that single attempt fails, the Luna fallback is retained and the failure recorded, with no repeated retries.

The coordinator alone may dispatch Sonnet workers within the assigned batch; workers may not dispatch further. The coordinator must not expand or create new scope. Shared limits remain two coding lanes plus one validation lane across both vendors, disjoint ownership and one integration batch. Publication, issue closure and final-review dispatch remain with the primary session. Preserve accepted work when switching vendors. Astra Low remains exclusively the final whole-model gate after primary lead readiness; the existing model approval is retained, with no retrospective Claude review.

Durable restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`. This paragraph supersedes older execution-model defaults, while preserving historical evidence.

## Now

Milestone 2, the eight model proposals, has its dispositions complete and its record gate pending. #35, #36, #37, #38, #39, #40, #64 and #65 are each closed as not planned with a published comment carrying retained cost, source-backed reopening condition and actual evidence; #64 and #65 closed after their children and deliver no feature. #63 stays open, ordered #59 then #54, with the module promise excluded under decision 15. Decision 16 neither accepts nor rejects #39. [Manifest](docs/bots/delivery/manifest.json) is the operative ledger; [delivery controls](docs/bots/delivery/CONTROLS.md) govern scope and review.

Product evidence: OpenAI Astra low approved exact SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; no Claude approval is claimed under the owner-authorized OpenAI-only exception. PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e`; merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. The unmodified local gate passed on that product candidate; actual VS Code host suites passed 16 with four documented optional screenshot skips, keyboard passed 23, and checker exited 0. No remote CI run was required or made.

## Next

Run the mandatory unmodified gate on the Milestone 2 records, then publish them; card 182 moves to done only after that gate. Milestone 3, diagrams and reliable drag checks (target: 16 open after it), is next after the Milestone 2 record publication. Model closeout records 0109d39e passed their own unmodified gate and landed on develop.

## Later

Resume diagram work (Milestone 3) after the Milestone 2 record publication. Remaining milestones and scope stay in the manifest and [roadmap](docs/bots/ROADMAP.md); no tooling or model-proposal implementation starts as part of this closeout.

## Outcomes / blockers

All 25 cards 157–181 are reconciled, marked done and non-live; the #108 parent was closed last after its child stories. Per-card journals cite the individual issue comments and merge/review evidence. The sprint retrospective records measured delivery results and the evidence-preparation lesson.

## Working state

Updated: 2026-10-03. Worktree `/Users/jonathanturnock/.codex/worktrees/relationship-pages/open-domain-specification`; branch `codex/decision-dispositions-2`; checked product commit `5a6241288973fc3befdb2f46876e28174534126e`. Current uncommitted changes are metadata-only: card 182, this status, roadmap, manifest and sprint 04. Card 182 is in review, not live; the mandatory records gate for these changes has not run.
