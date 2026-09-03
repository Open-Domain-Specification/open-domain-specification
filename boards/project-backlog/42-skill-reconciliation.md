---
column: todo
labels: [docs, ddd]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T13:45:00.000Z
---
# Skill: reconcile the model with the codebase and interview for comments (RFC-002 card H)

The AI skill gains reconciliation: on request it searches the repository for the evidence behind each strategic intent, writes comments with links, proposes a disposition where the code disagrees with the model, and says what it looked for when it finds nothing. The interview asks, per new strategic intent, "by design or something you are living with?" and "where does it live?".

## Checklist

- [ ] `packages/skill/skill/SKILL.md` gains a "Reconcile" playbook: per intent kind what to search for (ACL: adapter or translator on the downstream side; OHS: a published contract; shared kernel: a shared package; conformist: direct use of the upstream types), how to write the comment and link, when to propose `tolerated` or `refactor`
- [ ] Interview playbook: the two questions above, asked once per intent, never per role
- [ ] `references/dsl-api.md` and the JSON examples show `comments` and `disposition` on a relationship, a consumable and a consumption
- [ ] A worked example in `references/examples/petstore.md` reconciling the shared kernel to `refactor`
- [ ] `src/bundle.test.ts` covers the new files; skill package tests green

## Comments

- **lead** (2026-09-04T13:45:00.000Z): Assigned to dev-opus. Fixed by decision: the reconcile playbook is a section of SKILL.md plus a reference file, in the skill's existing voice; comments the agent writes must cite a path or URL in the link and say in the text what was found; when nothing is found the comment says what was searched for and the agent proposes no disposition. The interview questions are asked once per relationship, consumable-with-pattern or consumption-with-pattern, never per role. The petstore worked example reconciles the Catalog–Inventory shared kernel to refactor with the two comments the model already carries (models/petstore/src/workspace.ts). Read core's evidence.ts, patterns.ts and the regenerated references first. Work in your worktree with absolute paths for every suite; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
