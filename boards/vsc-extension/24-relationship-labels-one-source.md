---
column: todo
labels: [frontend, bug]
priority: med
agent: dev-sonnet
updatedAt: 2026-09-04T08:00:00.000Z
---
# One relationship label and one symmetric-type predicate for every surface

Card 23 left two duplicates. The extension tree builds its own relationship label ("A to B" / "A and B") so it disagrees with the spotlight and pages, and a `separate-ways` relationship reads "A to B" though it is symmetric. And `isSymmetricRelationship` now exists in pages (`packages/pages/src/lib/relationship.ts`) and again in the doc generator (`packages/doc/src/strategic-position.md.ts`).

## Checklist

- [ ] `isSymmetricRelationship(type)` and `relationshipTitle(r)` move to core (`packages/core/src/relationship.ts`, exported); pages and doc import them; the two local copies are deleted
- [ ] `apps/ods-vscode/src/tree.ts` relationship rows use `relationshipTitle`; the extension test asserts a symmetric row's label uses "and"
- [ ] Core, pages, doc and extension unit suites green; pages coverage unchanged

## Comments

- **lead** (2026-09-04T08:00:00.000Z): Assigned to dev-sonnet. Fixed by decision: the wording is whatever `relationshipTitle` in pages produces today; do not change it, only move it. Work in your worktree with absolute paths for every suite; a root `npm test` replays the main tree's cache. `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first. Start after card 23 has landed on develop (the lead will say).
