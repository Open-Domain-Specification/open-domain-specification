# Status

## Goal / health

Clear the guarded ODS backlog. Milestones 1 and 2 are complete and their records published: 25 model issues delivered, eight proposals closed not planned, 20 issues remain from the 54-open baseline. Milestone 3 has delivered #103; PR #106 is next. No new capability is claimed for the proposal dispositions.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while Claude usage is available; it delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, goal management, acceptance and delivery. Coordinator effort defaults to medium and never exceeds high. Verify actual runtime models; do not silently substitute. On an actual Claude usage-limit response, immediately stop all Claude work and fall back to GPT-6 Luna for all lanes (coding, investigation and verification), archive the limit/reset and avoid repeated retries. The owner reports a 01:00 Europe/London reset; after reset, make one bounded attempt on the next useful task. If that single attempt fails, the Luna fallback is retained and the failure recorded, with no repeated retries.

The coordinator alone may dispatch Sonnet workers within the assigned batch; workers may not dispatch further. The coordinator must not expand or create new scope. Shared limits remain two coding lanes plus one validation lane across both vendors, disjoint ownership and one integration batch. Publication, issue closure and final-review dispatch remain with the primary session. Preserve accepted work when switching vendors. Astra Low remains exclusively the final whole-model gate after primary lead readiness; the existing model approval is retained, with no retrospective Claude review.

Durable restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`. This paragraph supersedes older execution-model defaults, while preserving historical evidence.

## Now

Milestone 3 has delivered #103. PR #106 product source,168 actual-host cases and whole product quality remain accepted. Clean c299a433 passed the unmodified local gate (485 browser pass,20 documented skips; pages1084/100% and schema/ESM/pins passed). Required Linux CI37102120921 passed unit and real-vscode, but failed the initial cluster-containment setup poll before any zoom/drag (484 browser pass,1 failed,20 skips). Opus5.5/Sonnet5.5 read-only subsystem assessment proved the camera stayed at the sketch fit; switching Cards has no explicit fit trigger. The new test had assumed an automatic refit. Root now authorizes one test-only real Fit View setup correction, with controlled clipped-left/insufficient-right-room starting-pose proof before another gate/CI. The correction passed6 natural/controlled-bad-pose checks plus30 original drag checks. Both former bad geometry conditions are verified before the Fit View click; it normalizes to the same cards fit. The small test delta is complete; the final four-file outgoing quality review passed (no required changes). Root owns records. Twenty issues remain; no new/reopened tickets or merge/closure.

Milestone 2 records a647c6e0 passed their final unmodified gate and landed on develop; card 182 is done. Model approval remains historical e5cda126, with no new Astra request for UI/tooling.

## Next

Freeze one clean candidate and run the unmodified local gate once, then required exact-head Linux CI. CI only follows a newly proven local candidate; never rerun an unchanged failed head. Existing host/keyboard proof is retained for unchanged product source. If real Fit View fails to contain the visible clusters, stop and assess actual failure before another correction.

## Later

Finish PR #106 diagram fitting, then follow the remaining milestone order. Remaining milestones and scope stay in the manifest and [roadmap](docs/bots/ROADMAP.md); no tooling or model-proposal implementation starts as part of this closeout.

## Outcomes / blockers

All 25 cards 157–181 are reconciled, marked done and non-live; the #108 parent was closed last after its child stories. Per-card journals cite the individual issue comments and merge/review evidence. The sprint retrospective records measured delivery results and the evidence-preparation lesson.

## Working state

Updated: 2026-10-03T06:41:22.984008+00:00. Worktree `/Users/jonathanturnock/.codex/worktrees/cross-surface-fixture/open-domain-specification`; branch `codex/epic-102-diagram-fit`; product8ac154c5; HEAD/remote c299a433, base f06b8484. Test setup and three delivery records are unfrozen for the bounded correction; no other source/config/model/pin changes authorized. Card156 doing;183 done. Durable CURRENT.json tracks session82151 and actual evidence; old green gates and failed candidates remain historical.
