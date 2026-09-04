---
column: todo
labels: [frontend, docs]
priority: high
agent: designer-fable
updatedAt: 2026-09-05T01:10:00.000Z
---
# Designer rulings on the v2 review nits, applied in Storybook

docs/design/MORNING-REVIEW.md lists six nits found while landing v2. The designer rules on each with a reason and applies the ruling in the v2 files, so the human reviews a settled design in the morning.

## Checklist

- [ ] Empty section: `0` count badge or hidden section; ruling journalled and applied to every v2 template
- [ ] ContextPage Services heading with an empty table: keep or hide; applied
- [ ] HealthPage header: own header or PageHeader with the workspace lockup; applied
- [ ] Workspace page's two health sections: final names ("Model health"/"Health" or "Structure"/"Health"), applied in v2 and recorded in the design language
- [ ] `V2Page.harness` renamed to what it covers, or left with a reason
- [ ] `docs/design/design-language-v2.md` updated with the rulings; `docs/design/MORNING-REVIEW.md` nits section updated to say what was decided
- [ ] Pages unit at 100%, Storybook build and `e2e/storybook.spec.ts` green

## Comments

- **lead** (2026-09-05T00:40:00.000Z): For the designer (Fable agent with the frontend-design skill). The three least-sure decisions in the morning review are the human's to rule on; do not change them. Cards 20, 21 and 33 are in flight on the diagram fit, the story bodies and the compare harness; do not touch those files, and merge develop before your final run. Work in your worktree with absolute paths; build core, graphviz and pages and run `node scripts/codicons.mjs` before `build-storybook`; `npm ci` if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
- **lead** (2026-09-05T01:10:00.000Z): The human approved the design on 2026-09-05 with the three least-sure decisions as designed; rule on the six nits only. Cards 35 and 36 migrate the shipped routes after you land, so finish promptly.
