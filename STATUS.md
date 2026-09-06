# Status

## Goal / health

Goal (set 2026-09-07): the lead, asked whether the DDD metamodel is a good, clean, detailed specification for modelling systems the DDD way, answers yes without a caveat, and every independent reviewer agrees. Health: green. Develop CI passes on every merge commit; the landing gate (`npm run verify`) is green on the current head. Review panel on the card 97 head: Antigravity yes with named costs (four consecutive runs), Codex yes with named costs (run 5), fresh-context architect yes with named costs with three remaining items in card 98.

## Now

Card 98 ([boards/project-backlog/98](boards/project-backlog/98-upstream-is-who-dictates-the-language.md)): upstream is who dictates the language; a subscriber is a reactor; an aggregate-initiated call has a front. Owner: the senior developer spawned before the roster change, in its own worktree. Stopping point: the developer reports; the lead merges, runs the gate, pushes.

## Next

Land card 98, then run the panel a fifth time on that head (Antigravity, Codex, a fresh-context architect on the Fable model). Expected result: all three hold at yes with named costs and name no new defect, after which the lead answers the question and the pull request is ready for the owner to merge.

## Later

- Card 74's leftover and any panel findings after card 98 become new cards; the lead rules, developers implement.
- Decision 08 (multi-file workspaces) stays Proposed until implemented; roadmap milestone 4.
- Extension cards 83 to 85 and the design baseline sprint under `docs/team/design` and `docs/team/qa` were opened by a Codex session in this checkout and are not the lead's.

## Outcomes / blockers

- Shipped on develop: sprint 01 (cards 44 to 57) and sprint 02 (cards 58 to 97), decisions 13 to 28 with dated amendments; [sprint 02 file](docs/team/sprints/2026-09-07-sprint-02.md) has every landing, ruling and incident.
- Pull request 25 (develop to main) is open and mergeable; merging is the owner's call and cuts 0.5.0.
- Unresolved: none blocking. The roster changed twice on 2026-09-09; the the team are installed alone; nothing was restored after the uninstall at the owner's instruction.

## Working state

Updated: 2026-09-09. Branch: develop. Checked commit: the single squashed commit develop carries over main (see `git log main..develop`). Partial changes in the checkout not the lead's: `apps/ods-vscode/README.md` and `boards/vsc-extension/14-*.md`, modified by the Codex session; left untouched.
