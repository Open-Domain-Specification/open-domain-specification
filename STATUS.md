# Status

## Goal / health

Clear the guarded ODS backlog. Milestones 1–4 have delivered their accepted outcomes. The guarded baseline census is **12 remaining / 42 closed**, from 54 open: 34 implemented and eight not planned, with no new or reopened issues. No release is claimed.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while usage is available and delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, the goal, scope, acceptance, publication and closures. Coordinator effort defaults to medium, never above high; verify canonical runtime models. On an actual Claude usage-limit response, archive it and immediately use GPT-6 Luna for coding, investigation and verification, without repeated retries. The owner reports a 01:00 Europe/London reset; after reset, try once on the next useful assignment. Preserve accepted work when switching vendors.

At most two coding lanes plus one validation lane, one integration batch, disjoint ownership and serial builds/hosts. Workers do not delegate. The coordinator alone may dispatch Sonnet within the assigned batch and may not expand scope or publish. Astra Low is exclusively the final whole-model gate after complete work and primary readiness; retain the existing model approval and do not request it for UI/tooling or metadata.

Restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`.

## Now

Milestone 4 product delivery is complete. PR #134 merged as `42ae867d676f2c7c2c093b65d6417f2fc14367b1` on 2026-10-03T12:10:53Z; its tree exactly matches gated `ddbd01d1ea5494b9143e31b46243c1e31675ae12`. Required pre-merge CI 37121515458 and post-merge CI 37122052999 passed test/e2e/real-vscode; publish was skipped. Children #87, #88 and #80 were individually accepted and closed, then #105 last; actual GitHub remaining count is 12. Final local gate: 546 browser passes/20 documented baseline skips, 1,156 pages tests/100% coverage, package check 970 files with zero errors/warnings, unchanged exact model pins and schema/ESM. Actual CI VS Code standard 16/keyboard24/checker PASS, with four optional screenshot pending. Card 184 is done. Closing records still require their own clean-head gate and publication. Evidence: /Users/jonathanturnock/.codex/ods-delivery/milestone-04/closures/closures.json.

Milestone 3 closeout commit `000f5a7f` passed its own unmodified Node 26 gate and is published on `develop`: 485 browser tests passed, 20 documented skips, pages coverage 100%, schema/ESM checks and exact reference diagnostic pins unchanged. Its product tree is unchanged from accepted PR #106. Those are historical M3 results; the current guarded census is 12 remaining / 42 closed.

## Next

Review and gate the M4 closing records on a clean commit, then publish them to `develop`. After that, activate accessibility #78/#79/#83 with baseline-only authorization before implementation. Target after that batch: 9 remaining. No Astra UI review or release.

## Later

Follow the remaining [roadmap](docs/bots/ROADMAP.md): accessibility, navigation, phone reading, import/copy, multi-file #59, then forms #54 and parent #63 last. Preserve all four readers, reference diagnostic pins and generated integrity. No tooling expansion, optional redesign or new tickets as substitutes for delivery.

## Outcomes / blockers

No external blocker. Milestones 1–3 records are gate-green and published; M4 product is delivered and its closing records are being verified. The eight not-planned proposal dispositions are decisions rather than delivered features. No new or reopened tickets. Model approval remains historical on `e5cda126`; no Astra UI review.

## Working state

Updated: 2026-10-03T12:24:23.173452+00:00. Worktree `/Users/jonathanturnock/.codex/worktrees/cross-surface-fixture/open-domain-specification`; branch `codex/m4-table-closeout`, base `42ae867d676f2c7c2c093b65d6417f2fc14367b1`. Six record-only paths are uncommitted; product code is unchanged. Main-checkout biome/promo work is preserved. Durable CURRENT.json identifies the closing-record phase and evidence.
