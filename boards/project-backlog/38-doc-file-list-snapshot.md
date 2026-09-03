---
column: todo
labels: [infra, docs, backend]
priority: low
updatedAt: 2026-09-03T13:40:00.000Z
---
# Doc unit test: snapshot the file list toDoc produces for the petstore reference

A renamed or dropped page in the doc generator currently changes nothing a test sees. Add a unit test in packages/doc that runs `toDoc` over the petstore reference workspace (the pages package already reads it from `models/petstore/.ods/petstore.json`) and snapshots the sorted file list, so any change to the page set shows up in review.

## Checklist

- [ ] packages/doc/src/index.test.ts: sorted `Object.keys(await toDoc(petstore))` matches an inline snapshot (56 files today)
- [ ] Test reads the workspace file the same way packages/pages/src/site.test.ts does
- [ ] Root `npm test` green
