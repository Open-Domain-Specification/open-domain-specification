# Status

## Goal / health

Clear the guarded ODS backlog. Milestones 1–7 have delivered their accepted source outcomes. The actual census is **6 remaining / 48 closed**, from 54 open: 40 implemented and eight not planned, with no new or reopened issues. Remaining open: #94, #93, #92, #63, #59, #54. No release is claimed.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while usage is available and delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, the goal, scope, acceptance, publication and closures. Coordinator effort defaults to medium, never above high; verify canonical runtime models. On an actual Claude usage-limit response, archive it and immediately use GPT-6 Luna for coding, investigation and verification, without repeated retries. The owner reports a 01:00 Europe/London reset; after reset, try once on the next useful assignment. Preserve accepted work when switching vendors.

At most two coding lanes plus one validation lane, one integration batch, disjoint ownership and serial builds/hosts. Workers do not delegate. The coordinator alone may dispatch Sonnet within the assigned batch and may not expand scope or publish. Astra Low is exclusively the final whole-model gate after complete work and primary readiness; retain the existing model approval and do not request it for UI/tooling or metadata.

Restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`.

## Now

Milestone 7 (#82 phone reading) source is delivered. The unmodified whole gate on source candidate `d8e3c831` passed on the first attempt (00:26:39 to 00:29:54, 195 s): 1,313 pages tests at 100% coverage, 665 browser tests passed, 20 existing opt-in capture skips, zero failed, flaky or retried, and all model pins, schema, ESM entries and typechecks passed. PR #138 merged as `7599eef8` at 00:45:36Z with a tree (`292a756c`) identical to the gated tree. Pre-merge CI 37165358953 and post-merge CI 37166004365 each passed test, e2e and real-vscode on the exact heads, with publish skipped and no release. #82 was closed as completed at 00:58:54Z. Eight quality lenses had no blocker (highest 0.3).

The four native prose witnesses remain measurements on the older bundle, kept by unchanged CSS, shared RefList and embedded source; they are not new-bundle measurements. The current-head real-vscode CI job is the separate proof. See [retrospective 08](docs/bots/sprints/2026-10-04-retro-08.md).

The six M7 closing records (this status, the roadmap, the manifest, card 187, sprint 08 and retrospective 08) are written on `codex/m7-closeout-records` but have not had their own quality review, unmodified gate or publication. Those are pending.

M6 is fully delivered: #91/#77 individually closed after corrective PR137 postCI37155696421 passed all three jobs. Six closing records in `ef0a82eb` passed their own unmodified gate (181 s, 1283 pages/100% coverage, 652 browser/20 baseline-capture skips/zero flaky) and are published and verified on remote develop. Exact model approval unchanged.

## Next

Review these M7 closing records, run their own unmodified clean-head gate and publish them. Then Milestone 8 (import and copy finish): importer #92 and #93 go together, and #94 (unrelated copy) takes a separate PR. Read-only M8 preparation exists, but no M8 source starts until these records are gated and published. No Astra UI review or release.

## Later

Follow the remaining [roadmap](docs/bots/ROADMAP.md): import and copy finish (#92, #93, #94), multi-file #59, then forms #54 and parent #63 last. Preserve all four readers, reference diagnostic pins and generated integrity. No tooling expansion, optional redesign or new tickets as substitutes for delivery.

## Outcomes / blockers

Six actual open issues / 48 closed from 54 (40 implemented, eight not planned, no new/reopened issues). M1–6 and M6 records published; M7 source delivered, M7 records pending. No external blocker or Claude quota response. Foreground terminal/model checks, fail-fast host bootstrap, unique invocation logs, two-correction reassessment, 30-minute changed probe and 60-minute stop remain binding.

## Working state

Updated 2026-10-04. Branch `codex/m7-closeout-records`, base `7599eef89672646a3daa861485ebf26322968556` (the PR #138 merge). Six records are changed; nothing is committed or published. Card 187 is done (progress 100, live false). Models, core, generated references and exact model approval (Astra e5cda126, merged 5a624128) are unchanged; no new UI approval is claimed. The records' own quality, gate and publication are pending.

Earlier checkpoint (historical, kept as written): the M7 reader outcome and final quality were accepted on the `codex/m7-phone-reading` branch from base `ef0a82eb45fffd67412e3b67cbd93262d2e6254f` before landing.

M7 baseline checkpoint 2026-10-03T22:38:51.874000+00:00: actual54valid phone cells and6desktop; source/bundle unchanged. Two invariant pages overflow152/104px, allfamilies fulltreebeforepage. Root authorizes bounded narrowdisclosure and localprose wrap; product acceptance remains pending. Evidence: /Users/jonathanturnock/.codex/ods-delivery/milestone-07/baseline/root-acceptance.json.
