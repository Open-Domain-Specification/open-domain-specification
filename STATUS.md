# Status

## Goal / health

Clear the guarded ODS backlog. Milestone 1 is complete: PR #132 is merged and its 25 model stories were accepted and closed individually. The issue census is 29 open, 25 closed, zero new and zero reopened; the baseline was 54 open.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while Claude usage is available; it delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, goal management, acceptance and delivery. Coordinator effort defaults to medium and never exceeds high. Verify actual runtime models; do not silently substitute. On an actual Claude usage-limit response, immediately stop all Claude work and fall back to GPT-6 Luna for all lanes (coding, investigation and verification), archive the limit/reset and avoid repeated retries. The owner reports a 01:00 Europe/London reset; after reset, make one bounded attempt on the next useful task. If that single attempt fails, the Luna fallback is retained and the failure recorded, with no repeated retries.

The coordinator alone may dispatch Sonnet workers within the assigned batch; workers may not dispatch further. The coordinator must not expand or create new scope. Shared limits remain two coding lanes plus one validation lane across both vendors, disjoint ownership and one integration batch. Publication, issue closure and final-review dispatch remain with the primary session. Preserve accepted work when switching vendors. Astra Low remains exclusively the final whole-model gate after primary lead readiness; the existing model approval is retained, with no retrospective Claude review.

Durable restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`. This paragraph supersedes older execution-model defaults, while preserving historical evidence.

## Now

Milestone 2, resolve the eight model proposals (#35–#40, #64, #65), is next. Apply their existing decision records and reopen only on the recorded source-backed triggers. [Manifest](docs/bots/delivery/manifest.json) is the operative ledger; [delivery controls](docs/bots/delivery/CONTROLS.md) govern scope and review.

Product evidence: OpenAI Astra low approved exact SHA `e5cda1260f09b5b69a41b0a4027bd63fd33b1899`; no Claude approval is claimed under the owner-authorized OpenAI-only exception. PR #132 merged as `5a6241288973fc3befdb2f46876e28174534126e`; merged tree `6efd1aa35bae524dfce9345210096caeafcef236` exactly matches the reviewed candidate tree. The unmodified local gate passed on that product candidate; actual VS Code host suites passed 16 with four documented optional screenshot skips, keyboard passed 23, and checker exited 0. No remote CI run was required or made.

## Next

After the lead reviews and freezes this metadata-only closeout update, run the mandatory repository gate before any push. Do not treat the product gate above as a gate on the current record-only changes.

## Later

Resume diagram work after Milestone 2. Remaining milestones and scope stay in the manifest and [roadmap](docs/bots/ROADMAP.md); no tooling or model-proposal implementation starts as part of this closeout.

## Outcomes / blockers

All 25 cards 157–181 are reconciled, marked done and non-live; the #108 parent was closed last after its child stories. Per-card journals cite the individual issue comments and merge/review evidence. The sprint retrospective records measured delivery results and the evidence-preparation lesson.

## Working state

Updated: 2026-10-02T23:42:13Z. Worktree `/Users/jonathanturnock/.codex/worktrees/relationship-pages/open-domain-specification`; branch `codex/model-closeout-132`; checked product commit `5a6241288973fc3befdb2f46876e28174534126e`. Current partial changes are metadata-only: the 25 model cards, this status, roadmap, delivery controls, manifest and sprint 04. Mandatory closeout gate for these record changes is pending.
