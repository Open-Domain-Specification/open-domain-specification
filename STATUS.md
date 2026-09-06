# Status

## Goal / health

Goal (set by the owner on 2026-09-07): the lead, asked whether the DDD metamodel is a good, clean, detailed specification for modelling systems the DDD way, answers yes without a caveat, and every independent reviewer agrees. Health: green. Develop CI passes on every commit since the history squash; the landing gate (`npm run verify`) was green at the last landing (card 115). Review panel on the card 104 head: Antigravity yes with named costs (seven consecutive runs, every issue decided ground); Codex no on run 8 with two accepted gaps and nine decided; the fresh-context architect yes with named costs on round 8 with three rule gaps and one bent exemplar. Every accepted item landed as cards 107 to 110; the eighth round on the card 110 head is running.

## Now

Cards 116 ([an external invariant keeps to its contract; a sub-process on a ring is a call; a guard reads what its front fetched](boards/project-backlog/116-an-external-invariant-keeps-to-its-contract-a-sub-process-is-a-call-a-guard-reads-what-its-front-fetched.md), senior-developer) and 118 ([the ESM build of core loads](boards/project-backlog/118-the-esm-build-of-core-loads.md), developer) are live in their own worktrees; card 117 ([a fifth model written blind in an unfamiliar domain](boards/project-backlog/117-a-fifth-model-written-blind-in-an-unfamiliar-domain.md), developer) waits for 116. Ninth round on the card 115 head: Antigravity run 21 yes with named costs, all decided; Codex run 10 stopped at the owner's instruction; architect round 10 yes with named costs, three defects and two costs in card 116, the ESM build in card 118, the fitting worry in card 117. Eighth round on the card 110 head: Antigravity run 20 yes with named costs, every issue decided ground; Codex run 9 no, three reproduced gaps landed as card 113 and nine restatements; architect round 9 yes with named costs, one defect and two unnamed costs in card 114, the rest named in decisions. Stopping point: each reviewer's verdict is read and ruled, new defects become cards, restatements are answered by the decision they restate. Stopping point for each: the developer reports, the lead lands with `npm run verify`. Cards 99 to 110 and 113 to 115 landed green; 107 gave RiverMart the first two named agreements in a reference model.

## Next

Land 116 and 118, dispatch 117, land it; then Antigravity and a fresh architect review that head. From here Codex runs only when the lead is very confident it will answer yes, at the owner's instruction (its usage is limited); Antigravity and a fresh architect review each head. Expected result: Antigravity and the architect hold at yes with named costs and name no new defect; then the lead answers the question and pull request 25 is the owner's to merge.

## Later

- New panel findings become cards; the lead rules, developers implement, the lead lands. Restatements of decided ground are answered by the decision, not by a card.
- Backlog, not on the release path: card 111 (the pages show which agreement an exchange belongs to) and card 112 (a formatting pass at the root).
- Decision 08 (multi-file workspaces) stays Proposed until implemented; roadmap milestone 4.
- Files created by a Codex session in this checkout are untracked and not the lead's: extension cards 83 to 92, `docs/bots/design`, `docs/bots/qa`, and `docs/bots/sprints/2026-09-05-design-baseline.md`; two files it modified (`apps/ods-vscode/README.md`, `boards/vsc-extension/14-*.md`) are unstaged. Leave them unless the owner says otherwise.

## Outcomes / blockers

- Shipped on develop: sprints 01 and 02 (cards 44 to 105), decisions 13 to 29 with dated amendments; [sprint 02](docs/bots/sprints/2026-09-07-sprint-02.md) records every landing, ruling, review round and incident, including the history squash.
- On 2026-09-09 the owner had develop squashed to one commit over main with every themed agent name replaced by its role, and all harness customisation removed for a fresh start; the lore-free roster was then installed. Develop is now a short, clean history over main.
- Pull request 25 (develop to main) is open and mergeable; merging is the owner's call and cuts 0.5.0.
- Unresolved decision for the owner: Codex has said no on runs 6 to 9, and after every reproduced defect was fixed its remaining objections are decisions it disputes (17 application-service mediation, 16 the kernel as a context, 15 unions, modules and value-object behaviour, 23 commands against events, 08 one file). A Codex yes needs one or more of those reopened; the lead defends them as written and will not run Codex again until told which, if any, to reopen.

## Working state

Updated: 2026-09-10, unattended run continuing after the handoff note. Branch: develop. Checked commit: the one immediately before this STATUS.md on develop. Partial changes in the checkout: only the untracked and unstaged files listed under Later, none of them the lead's. Landing gate: `npm run verify` at the root, run detached with `nohup` because it can outlast a ten-minute command cap; before running it, `pgrep -f 'ods-vscode.*dev.mjs'` and `pgrep -f extensionDevelopmentPath` must find nothing, because a running extension host rewrites the petstore schema.
