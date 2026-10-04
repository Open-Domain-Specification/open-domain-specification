# Status

## Goal / health

Owner has requested review of milestones 1-8 with the entire #63 epic outside develop and main. This branch restores the accepted M8 baseline; root's publication state is authoritative. The dedicated `codex/epic-63-team-authoring` branch preserves M9/M10. #54 and #63 remain open. No release.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while usage is available and delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, the goal, scope, acceptance, publication and closures. Coordinator effort defaults to medium, never above high; verify canonical runtime models. On an actual Claude usage-limit response, archive it and immediately use GPT-6 Luna for coding, investigation and verification, without repeated retries. The owner reports a 01:00 Europe/London reset; after reset, try once on the next useful assignment. Preserve accepted work when switching vendors.

At most two coding lanes plus one validation lane, one integration batch, disjoint ownership and serial builds/hosts. Workers do not delegate. The coordinator alone may dispatch Sonnet within the assigned batch and may not expand scope or publish. Astra Low is exclusively the final whole-model gate after complete work and primary readiness; retain the existing model approval and do not request it for UI/tooling or metadata.

Restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`.

## Now

Prepare the rollback candidate on `codex/defer-epic-63` for the requested M1-8 review handoff. Before record edits, its staged tree exactly matched accepted M8 baseline `5120fd5487d2d172ac6dd24eaa83e8be68e0b2d9` (tree `39e5572e324a1fdb6950fc007ff1353621ad7c19`). That baseline's closing-record gate passed exit 0 in 188 seconds and was published to develop. Root owns review, gate and publication of this rollback candidate.

## Next

Owner review of M1-8 on `codex/model-extension-review` (`5120fd54`) comes first. M9/#59 and M10/#54/#63 are deferred to `codex/epic-63-team-authoring` at `88cb0f610e9e5c164acaf0c69362469108f33fb9`; keep the whole epic outside develop and main during review. The M9 Astra/Claude approval of `8b98b6e6812b04b31cd9e5adb6c2f87787d16035` remains historical on that epic work and does not approve this baseline. #59 is reopened for the owner-requested deferral. Reintegrating later requires reverting the separation rollback or cherry-picking from the dedicated branch.

## Later

#54 forms follow #59 after owner review. The previous survey's "current commands none" is a premise gap, not scope zero. Parent #63 remains last after a whole-promise audit. Preserve all four readers, exact model pins, generated integrity and historical M1 model approval. No new Astra UI/tooling/metadata review.

## Outcomes / blockers

M8 importer PR139: source 23c281af, unmodified gate 190 s (1323 pages/100%, 689 browser, 20 existing opt-in baseline skips, 0 failed/flaky/retried), merge af913078 with identical tree f1991f8f, pre/post CI 37170929768/37171695891 success, publish skipped; #92 closed 02:50:38Z, #93 02:50:41Z. M8 copy PR140: source fe7e59e8, unmodified gate 190 s (same counts), merge a7552b96 with identical tree 1b76924e, pre/post CI 37173478992/37174063275 success, publish skipped; #94 closed 03:34:52Z. Four manual CI runs, no automatic duplicates, no release, no quota response. Evidence: external milestone-08 importer/publication/closures.json and copy/publication/closures.json; retrospective docs/bots/sprints/2026-10-04-retro-09.md. No blocker.

## Working state

Updated 2026-10-04. Branch `codex/defer-epic-63`, based on 88cb0f61, carries three no-commit reverts. Product, models and generated files match the accepted M8 baseline exactly; root will verify and publish the candidate. The M8 retrospective's limits remain in force: no true OS cancel or same-file dedupe proof, no phone contents anchor proof, and uneven quality record depth.

Closing-record quality checkpoint 2026-10-04T03:48:34.280617+00:00: eight canonical Sonnet end turns through Opus, highest 0.3, no blocker; metadata-only, no independent model approval. M8 record gate passed and was published on `5120fd54` (188 seconds, exit 0; 1323 page tests, 100% coverage, 689 browser passed, 20 existing skips, no failures/flakes/retries). GitHub snapshot after #59 reopen: 51 closed / 3 open (#59, #54, #63); 43 completed and 8 not planned. One deliberate reopening records the owner’s sequencing change.

Review-first retrospective: keep cumulative test effort proportionate. Observed worker saturation is not proven to have caused historical CI reporter failures; preserve failure evidence and avoid speculative rabbit holes or new gates. The #63 work remains on its dedicated branch.

Owner ban remains: no mutation scripts, harnesses or campaigns, including scratch/evidence automation; no added long-running suites or slow gates. Use focused meaningful regressions and existing required gates.
