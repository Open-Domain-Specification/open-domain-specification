# Status

## Goal / health

Clear the guarded ODS backlog. Milestones 1–5 have delivered their accepted outcomes. The actual census is **9 remaining / 45 closed**, from 54 open: 37 implemented and eight not planned, with no new or reopened issues. No release is claimed.

## Binding delegation policy — 2026-10-03

Claude Opus 5.5 is the technical coordinator while usage is available and delegates bounded work to Sonnet 5.5. The primary OpenAI session owns concrete work management, the goal, scope, acceptance, publication and closures. Coordinator effort defaults to medium, never above high; verify canonical runtime models. On an actual Claude usage-limit response, archive it and immediately use GPT-6 Luna for coding, investigation and verification, without repeated retries. The owner reports a 01:00 Europe/London reset; after reset, try once on the next useful assignment. Preserve accepted work when switching vendors.

At most two coding lanes plus one validation lane, one integration batch, disjoint ownership and serial builds/hosts. Workers do not delegate. The coordinator alone may dispatch Sonnet within the assigned batch and may not expand scope or publish. Astra Low is exclusively the final whole-model gate after complete work and primary readiness; retain the existing model approval and do not request it for UI/tooling or metadata.

Restart authority: `/Users/jonathanturnock/.codex/ods-delivery/EXECUTION-POLICY.md`, `FINAL-REVIEW-POLICY.md` and `CURRENT.json`.

## Now

Milestone6 #91/#77 source, actual hosts and complete quality are accepted. Candidate `b757fd2e` passed the unmodified local gate (652 browser passes, 20 baseline capture skips, 1283 pages tests/100% coverage). PR136 merged as `5bfdb713` with an identical tree; preCI37152204246 passed all three jobs. PostCI37152866652 passed browser and real VS Code but failed one new App history-availability unit assertion. Both issues remain open; nine actual issues remain.

Opus/Sonnet diagnosed a sufficient test deadline mechanism, with the exact CI interleaving still unproven. A controlled 1100 ms traversal stall reproduced Catalog heading plus stale availability; separate heading/message waits passed the same stall while retained last-message/exact-sequence assertions still rejected delayed messages and two router mutations. Only packages/pages/src/app/App.test.ts changes; production/hosts/model approval remain preserved. Root tightened page-name assertions and is preparing the clean corrective candidate and mandatory gate.

M5 is complete: PR135 merged `f2069a34` with identical gated `f3ff556d` tree; required pre/postCI37142462656/37142959185 all3jobs green,publish skipped. #78/#79/#83 closed individually18:17:46/51/54Z. Six closing-record paths in `8606b282` passed their own unchanged Node26 gate(614browser/20baseline skips,1244pages/100%coverage,974-file check0/0,pins/schema/ESM) and are verified on remote develop. Product unchanged. Card185done and retrospective06 preserve actual failures/controls. The model's exact AstraLow approval remains unchanged.

## Next

Run the unmodified landing gate on the clean corrective commit, then deliver a corrective PR against develop with only required exact-head pre/post CI (release=false). PR136 is already merged and cannot receive a correction; this repair remains within #77/#91, without a new issue or epic. Close the two issues only after successful corrective postmerge verification, then own-gate and publish closing records.

## Later

Follow the remaining [roadmap](docs/bots/ROADMAP.md): navigation, phone reading, import/copy, multi-file #59, then forms #54 and parent #63 last. Preserve all four readers, reference diagnostic pins and generated integrity. No tooling expansion, optional redesign or new tickets as substitutes for delivery.

## Outcomes / blockers

M6 closeout is held by the failed postmerge unit check, with an evidence-backed test-only correction now ready. No quota response occurred. Diagnosis exceeded its one-probe allowance; two local probes and a timeout127 attempt are preserved. The later deterministic proof distinguishes sufficient mechanism from unproven CI cause. No speculative production recovery, new scope or repeated final-model review is authorized.

## Working state

Updated 2026-10-03T21:16:04.332806+00:00. Branch `codex/m6-history-evidence-correction`, checked base `5bfdb71378f576df1b90c26f482addbaab376e77`. Correction: one test plus STATUS and card186; no production changes. Exact candidate/gate identity and failed CI evidence remain in `/Users/jonathanturnock/.codex/ods-delivery/CURRENT.json`. No corrective gate/CI/closure success claimed.
