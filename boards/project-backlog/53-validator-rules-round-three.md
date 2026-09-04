---
column: todo
labels: [backend, ddd]
priority: high
agent: ironhide
updatedAt: 2026-09-06T22:00:00.000Z
---
# Validator rules, round three

From Antigravity run 4 (scratchpad agy-run4.md, issues 12, 13, 18). Each is a rule with a catalogue entry (why, fix), tests for the failing and boundary-passing shapes, and the four models checked.

## Checklist

- [ ] `relationship-cycle` (warning): the directed relationships (`upstream-downstream`, `customer-supplier`) form no cycle; the message lists the cycle's contexts in order
- [ ] `partnership-backed` (warning): two contexts declaring a partnership have consumable traffic in both directions
- [ ] `disposition-needs-comment` (warning): an intent whose disposition is `tolerated` or `refactor` carries at least one comment
- [ ] Skill references regenerated; validation docs page updated; four models validate with only their declared deliberate diagnostics

## Comments

- **optimus-prime** (2026-09-06T22:00:00.000Z): Ironhide, after card 48 lands (the lead will say). No schema change. Work in your worktree with absolute paths; if the card is missing, `git reset --hard develop` there first.
