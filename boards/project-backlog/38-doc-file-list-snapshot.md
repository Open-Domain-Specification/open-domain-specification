---
column: todo
labels: [infra, docs, backend]
priority: low
agent: dev-sonnet
updatedAt: 2026-09-03T15:00:00.000Z
---
# Doc unit test: snapshot the file list toDoc produces for the petstore reference

A renamed or dropped page in the doc generator currently changes nothing a test sees. Add a unit test in packages/doc that runs `toDoc` over the petstore reference workspace (the pages package already reads it from `models/petstore/.ods/petstore.json`) and snapshots the sorted file list, so any change to the page set shows up in review.

## Checklist

- [ ] packages/doc/src/index.test.ts: sorted `Object.keys(await toDoc(petstore))` matches an inline snapshot (56 files today)
- [ ] Test reads the workspace file the same way packages/pages/src/site.test.ts does
- [ ] Root `npm test` green

## Comments

- **lead** (2026-09-03T15:00:00.000Z): Assigned to dev-sonnet. Fixed by decision: one test, inline snapshot via `toMatchInlineSnapshot`, keys sorted with default `sort()`. Read the workspace exactly as packages/pages/src/site.test.ts does (copy its read helper, do not import from pages). If `Workspace.fromSchema` (or whatever site.test.ts uses) needs the schema file, take the same path. Card 37 is adding an index.html in parallel; snapshot what toDoc returns in your tree today (56) and the lead will refresh it at merge. Tests that prove it: `npm test -w packages/doc` and root `npm test`. Work in your worktree; `npm ci` there first if node_modules is missing.
