---
name: project-status
description: Maintain the working project's root STATUS.md as an Agile Information Radiator when starting, progressing or handing off work.
---

# Project status

Keep the working project's root `STATUS.md` short and current. Read it at startup
and verify it against the checkout and active tasks before relying on it.

Include:

- **Goal / health:** objective, current condition and evidence.
- **Now:** active work, owner and exact stopping point.
- **Next:** first concrete action and expected result.
- **Later:** relevant deferrals, reasons and revisit triggers.
- **Outcomes / blockers:** completed work, verification and unresolved decisions.
- **Working state:** updated time, branch, checked commit and partial changes.

Link RepoDoc cards or existing issues; do not duplicate the backlog. Follow
RepoDoc's own skill for its workflow. Git preserves previous snapshots.

The lead or sole agent maintains the file; teammates report updates to the lead.
Respect read-only permissions. Refresh after meaningful changes, before authorized
commits and at handoff. Include it with implementation commits.

Record facts, not assumed success. Keep secrets and full logs out. This skill
does not authorize commits, pushes or external updates.
