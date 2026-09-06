---
name: sprint-start
description: Supervise a GitLab sprint prepared by sprint-plan, dispatch ready stories across agent lanes, verify integration, track blockers, and reconcile delivery against its goal.
---

# Sprint Start

Supervise sequencing, dispatch, stalls, and branch integration. Implementation, design decisions, and review belong to their owners. Run until the planned goal is reached, proven unreachable, or stopped by the operator.

## Establish the sprint

- Require the `sprint::<goal-slug>` label from `sprint-plan`; otherwise stop and report that planning is missing. Labelled issues define membership; count all pages, including closed issues.
- Read the verbatim goal, priorities, tracking issue, agent/human identities, decision owner, actual `workflow::*` labels, and project gate commands from repository instructions. Ask only for missing information; do not invent a goal or tracking issue. Pending a tracking issue, record relevant updates on work items.
- GitLab issues are stories; RepoDoc cards are tasks owned by the implementing agent. Read cards on feature branches, never create, edit, or move them as supervisor.

## Permissions

Operate within the user's authorization. This skill permits only these supervisor actions; anything else requires escalation:

- Read repository files, tracker records, pipelines, traces, todos, executor jobs, and Git history/branches; fetch remote state. Inspect changed-file lists for footprint, not diffs for correctness.
- Use detached scratch worktrees outside the repository for merge probes and the project's documented gates. Never commit or push scratch work; abort merges and remove only those scratch worktrees in the same pass.
- Assign/unassign agents at release, apply/remove existing `workflow::*` labels, post notes or edit your own notes, and set/change MR reviewers.

Do not edit repository files, create/delete branches or tags, commit/push, create/delete issues, edit issue titles/descriptions or other labels, change issue state, author/review/approve/merge/close/rebase MRs, alter another agent's todos, trigger/retry/cancel jobs, change project settings, or choose designs/scope. Do not delegate a prohibited supervisor action to bypass this boundary; dispatching authorized story implementation remains the agents' job.

Escalate decisions and prohibited actions to the operator with the owner, options, blocker, and cost of delay; record answers on the tracking issue. If unattended, leave the decision blocked and continue independent eligible work. Answer reviewer questions only with observed facts; route correctness questions to the author. Flag contradictory state and hold the affected item until resolved.

## Each pass

One pass per trigger: observe, decide, act, report. Use the configured wait/scheduling mechanism between passes, not an internal polling loop.

1. Read sprint issues, MRs/reviewers, notes, branches, gates, and executor jobs using the repository's GitLab host. Read feature-branch cards for `column`, `status`, `progress`, and failed gates. Missing cards across two passes merit investigation.
2. Verify the actual runner identity, not the triggering actor, against a second source once. Check live work across projects before calling a lane idle or stalled. If executor data is unavailable, report the coverage gap; continue evidence-based dispatch but do not poke for a presumed stall.
3. Release eligible work by recorded priority, then by how much it unblocks. An author awaiting review can take other work. Never assign queued work merely to record ownership: assignment starts an agent.
4. Report goal-relative counts, measurements, changes, escalations, and skipped coverage. Post a durable note on the tracking issue; edit near-duplicates. State whether the pass is terminal or handed over.

Mentions and reviewer assignments trigger paid runs. Budget at most one mention/review request per person per pass; use one actionable dispatch note at release, no mentions in status-only notes, no urgency mentions to reviewers, and never mention yourself.

## Readiness and dispatch

Before every release, require: a who/what/why user story; executable `Scenario:` acceptance criteria with concrete `Given`/`When`/`Then`; no unresolved decision; a known complete file footprint; and the sprint label.

Return unready stories to the operator with the specific failed check and quoted gap; record blocked-on-planning and continue eligible stories. Do not refine them yourself. Three or more unready stories warrant an explicit planning warning.

Give each lane the union of all required files, not a topic. Keep CI, Dockerfiles, lockfiles, and generated files under one lane owner. Release disjoint work immediately; release overlapping work only after a clean merge probe, respecting exclusive ownership.

Each dispatch includes:

- Story and Gherkin scenarios as acceptance criteria.
- Decompose into RepoDoc cards on the feature branch before coding, per scenario or related group, following `repodoc-workflow`.
- Completion evidence: every card ready for human review (`review`, or already human-completed) and every scenario mapped to a passing assertion in the MR. Humans move cards to `done`.
- File boundary; stop and report if it must expand or the story proves unrefined.

## Integration and stalls

- Probe overlapping branches in a fresh detached scratch worktree with `git merge --no-commit --no-ff`; record conflicts, then abort. For cumulative integration, use the documented gate commands on the combined tree without committing. A clean textual merge does not prove compilation or correctness; report actual gate results/counts. These checks establish coexistence, not review approval.
- Before a stall poke, check live executor work, overlooked comments, and pushed branches without MRs. Poke once with a stated deadline; escalate only after it passes. Ask for the blocked deliverable, never choose an outstanding decision.
- An MR unchanged across two passes with no reviewer merits routing; one awaiting its assigned reviewer is queued, not an author stall.
- Track open MRs, merges completed, reviewer queue depth when visible, and lanes waiting on work versus review. Keep dispatching disjoint work despite a deep review queue. If review is pending and zero merges occur across three consecutive passes, stop dispatching and escalate. Reduce conflict-check overhead when evidence shows it is unnecessary.
- Move only existing workflow labels, with a reason. If none exist, report once that there is no workflow board. Correct mistaken attributions where originally posted.

## Scope and reporting

Record newly discovered work and whether it blocks the goal. Goal-blocking additions need owner refinement/scope decisions; other discoveries remain backlog proposals. Do not create issues or change sprint labels yourself. Explain membership changes, who decided, and displaced work.

Keep each pass concise:

```text
goal: <verbatim> | sprint::<goal-slug>
stories: done N/M | in flight N | blocked N (cause) | unready N
tasks: per-story review/total and failed gates
churn: added N | dropped N | why
lanes: owner | in flight | workflow | MR | executor
actions: dispatched | poked | measured | escalated | coverage gaps
```

Optional observation subagents must be read-only: no writes, pushes, or posts. Select an available model appropriate to the check; use stronger reasoning for gating judgments.

## Closeout

Stop at **reached**, **unreachable** (state the dependency and when it became clear), or **operator-stopped**. Do not start backlog work after the finish.

Re-read current issues, MRs, and test evidence rather than summarizing from memory. Post one reconciliation note on the tracking issue:

- Verbatim goal and explicit met/not-met verdict; if unmet, state precisely what is missing.
- Shipped N/M and merged MR count. A merged MR alone is not shipment: verify each scenario maps to an assertion that runs and passes; report unavailable evidence as unknown.
- Carried stories with specific blockers; dropped stories with decision owners; added stories and displaced work; unready stories and failed checks.
- Scenario drift: planned versus delivered behavior and why it changed.
- Discovered but unfiled work and outstanding decisions for the next planning session.

Preserve sprint labels as history. Report exact counts and evidence gaps without rounding misses into success.
