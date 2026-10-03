# Status

## Goal / health

Clear the guarded ODS backlog. Milestones 1–3 have delivered their accepted outcomes. The live census is **16 open / 38 closed**, from 54 open: 30 implemented and eight not planned, with no new or reopened issues. No release is claimed.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while usage is available and delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, the goal, scope, acceptance, publication and closures. Coordinator effort defaults to medium, never above high; verify canonical runtime models. On an actual Claude usage-limit response, archive it and immediately use GPT-6 Luna for coding, investigation and verification, without repeated retries. The owner reports a 01:00 Europe/London reset; after reset, try once on the next useful assignment. Preserve accepted work when switching vendors.

At most two coding lanes plus one validation lane, one integration batch, disjoint ownership and serial builds/hosts. Workers do not delegate. The coordinator alone may dispatch Sonnet within the assigned batch and may not expand scope or publish. Astra Low is exclusively the final whole-model gate after complete work and primary readiness; retain the existing model approval and do not request it for UI/tooling or metadata.

Restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`.

## Now

Milestone 3 is delivered. #103 landed separately in PR #133; PR #106 delivered #86, #89, #90 and #102, closed individually with the parent last. Candidate `2f4fb124` passed the unmodified Node 26 gate (485 browser cases, 20 documented skips; 1,084 pages tests with 100% coverage, schema/ESM/reference checks). PR #106 merged as `d87ba634`; its tree exactly matches the gated candidate. Required pre-merge CI 37104242808 and post-merge CI 37104707314 passed test/e2e/real-vscode, with release disabled. Card 156 is done; card 183 remains done.

The earlier pan and automatic-fit test setup failures are retained in the journals. The final setup uses the real Fit View control before the drag baseline and passed six natural/controlled-bad-pose checks plus 30 original drag checks with every original tolerance unchanged. The controlled start proves left clipping and insufficient right room before recovery; Linux acceptance passed afterward. The model's Astra approval remains on `e5cda126`, no new approval is claimed.

## Next

Publish these closeout records only after their own clean unmodified gate. Then activate Milestone 4, epic #105 and children #87, #88 and #80: glossary prose width, intact attribute type alternatives, and a named but visually empty icon header. Read-only current caller/type-format inventory and root decisions are prepared; no baseline or implementation is claimed yet. Reproduce before source changes, prove all AttributeTable caller families and actual hosts, then the required quality/local gate/CI. Target 12 open after that batch.

## Later

Follow the remaining [roadmap](docs/bots/ROADMAP.md): accessibility, navigation, phone reading, import/copy, multi-file #59, then forms #54 and parent #63 last. Preserve all four readers, reference diagnostic pins and generated integrity. No tooling expansion, optional redesign or new tickets as substitutes for delivery.

## Outcomes / blockers

No external blocker. Post-merge acceptance and the actual GitHub census prove Milestone 3 closures. Repository closeout publication remains pending its mandatory gate. Milestones 1 and 2 record commits `0109d39e` and `a647c6e0` are already gate-green and published. Eight proposal dispositions remain not-planned decisions, not delivered features.

## Working state

Updated: 2026-10-03T07:14:12.040037+00:00. Worktree `/Users/jonathanturnock/.codex/worktrees/cross-surface-fixture/open-domain-specification`; branch `codex/m3-diagram-closeout`, base `d87ba634`. Only six delivery records change; product source equals the accepted PR #106 tree. All technical actors are terminal. Durable CURRENT.json tracks this record freeze/gate and subsequent Milestone 4 activation. Main-checkout biome/promo work is preserved.
