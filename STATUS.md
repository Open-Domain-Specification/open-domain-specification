# Status

## Goal / health

Clear the guarded backlog: **2 open / 52 closed** from54 (44implemented,8notplanned,zero new/reopened). Open #54,#63. Milestones1–9 and their closing records are delivered. M10 source foundations are accepted for form implementation; full authoring acceptance remains open. No release.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while usage is available and delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, the goal, scope, acceptance, publication and closures. Coordinator effort defaults to medium, never above high; verify canonical runtime models. On an actual Claude usage-limit response, archive it and immediately use GPT-6 Luna for coding, investigation and verification, without repeated retries. The owner reports a 01:00 Europe/London reset; after reset, try once on the next useful assignment. Preserve accepted work when switching vendors.

At most two coding lanes plus one validation lane, one integration batch, disjoint ownership and serial builds/hosts. Workers do not delegate. The coordinator alone may dispatch Sonnet within the assigned batch and may not expand scope or publish. Astra Low is exclusively the final whole-model gate after complete work and primary readiness; retain the existing model approval and do not request it for UI/tooling or metadata.

Restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`.

## Now

M9 multifile support is delivered in PR #141. Astra Low and Claude Opus 5.5 approved exact candidate `8b98b6e6812b04b31cd9e5adb6c2f87787d16035`; merge `dc040764e4b9565fc023f6725de26c40caf02a8e` has the identical tree. The unmodified clean-head landing gate passed. Pre-merge CI 37202757756 and post-merge CI 37203798923 passed package, browser, real VS Code, keyboard and result-guard steps; publishing was skipped. #59 is closed.

The first pre-merge package job had a Vitest reporting timeout after all 1,547 page tests passed. Only that failed job was retried; the successful browser/native jobs were retained. The raw failed evidence is preserved. No testing framework or timeout change was made.

## Next

Implement #54 against the accepted multifile resolver. M9 closing records eb6707b3 passed their own unmodified gate and were published with the remote verified. The source-backed inventory covers 20 authoring families and 39 add/update operations, plus safe workspace creation. Real extension-owned forms have labelled fields, legal dropdowns, populated updates and explicit Save/Cancel. Two palette commands and context-aware tree entry points keep the command surface small.

Opus coordinates bounded Sonnet subsets. Safe creation/fresh reads, core legal-choice queries and atomic writer source are accepted for downstream implementation. Focused checks: 17 legal-choice cases, 8 safe-create cases and 102 writer cases; owning types/format/build passed. Real-host evidence remains outstanding. Host form descriptors/session/choices are now accepted for all 39 operations. The final 26 authoring cases pass, including draft-choice refresh, complete relationship checks and deadline update. The real labelled webview and command/tree source are accepted for native verification. A bounded form-script correction preserves newer unfinished drafts and focus across older host refreshes; actual DOM proof remains outstanding. The existing native Add/Update journeys now pass, including unfinished-draft/focus preservation, Cancel/no-write and visible required-field refusal. The multi-file host checks prove all loaded owners, owner-only writes and safe-create refusal. Integrated quality is complete. Confirmed dirty-buffer completion messaging and shared-label corrections passed 18 core-query and 24 session/choice cases plus owning checks; README now matches actual Add/Update, owner and editor-save behavior. Next: existing complete-batch landing gate and all five native configurations plus keyboard/result guard on a clean committed candidate. The writer must reject choices that become illegal or stale during a form, while preserving unrelated or deliberately pinned diagnostics. Existing identity keys remain read-only; display names and supported mutable fields are editable. Real native add AND update journeys must interact with the actual form DOM.

## Later

Close #54 only after complete acceptance, exact gates and merge verification. Audit every promise of #63 and close it last. A zero issue count alone is not goal completion. No modules, shared assets, compatibility or release. Astra remains a final whole-model gate; no new Astra review for forms/UI or these metadata records.

## Working state

Updated 2026-10-04T16:10:17.913482+00:00. Branch codex/m10-authoring is based on published eb6707b3. The M10 candidate is local and unpushed; no M10 PR or full landing gate yet. Its exact clean commit and verification evidence are recorded in the durable checkpoint. The next complete batch must pass the unmodified landing gate before push. Next sprint: `docs/bots/sprints/2026-10-04-sprint-11.md`. Durable acceptance, controls and raw evidence: `/Users/jonathanturnock/.codex/ods-delivery`.

## Binding owner verification cadence

Do not add mutation-testing scripts, harnesses or campaigns, including evidence/scratch automation. Do not add long-running suites or new slow gates. Use focused meaningful regressions and existing required landing/native gates; defer full existing suites to the complete-batch gate and avoid optional broad repetitions. Latest owner instruction overrides older mutation requests in skills/briefs. This rule must survive compaction and enter every remaining worker brief.
