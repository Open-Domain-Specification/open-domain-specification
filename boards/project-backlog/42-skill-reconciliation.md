---
column: backlog
labels: [docs, ddd]
priority: high
updatedAt: 2026-09-04T08:00:00.000Z
---
# Skill: reconcile the model with the codebase and interview for comments (RFC-002 card H)

The AI skill gains reconciliation: on request it searches the repository for the evidence behind each strategic intent, writes comments with links, proposes a disposition where the code disagrees with the model, and says what it looked for when it finds nothing. The interview asks, per new strategic intent, "by design or something you are living with?" and "where does it live?".

## Checklist

- [ ] `packages/skill/skill/SKILL.md` gains a "Reconcile" playbook: per intent kind what to search for (ACL: adapter or translator on the downstream side; OHS: a published contract; shared kernel: a shared package; conformist: direct use of the upstream types), how to write the comment and link, when to propose `tolerated` or `refactor`
- [ ] Interview playbook: the two questions above, asked once per intent, never per role
- [ ] `references/dsl-api.md` and the JSON examples show `comments` and `disposition` on a relationship, a consumable and a consumption
- [ ] A worked example in `references/examples/petstore.md` reconciling the shared kernel to `refactor`
- [ ] `src/bundle.test.ts` covers the new files; skill package tests green
