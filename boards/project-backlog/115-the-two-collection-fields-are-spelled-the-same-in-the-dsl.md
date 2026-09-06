---
column: todo
labels: [backend]
priority: low
agent: developer-lite
live: true
updatedAt: 2026-09-10T14:10:00.000Z
---
# The two collection fields are spelled the same in the DSL

Card 114 gave a request `many` the way an answer has it, and the DSL now spells the two differently: `schema: { of, many }` on the request and `returns: { schema, many }` on the answer. The wire format is `{ $ref, many }` for both. Align both on `{ of, many }`; five call sites (`models/petstore/src/workspace.ts`, three test or fixture files, one docs example) and the skill's DSL reference.

## Checklist

- [ ] `ConsumableAttributes.returns` takes `{ of, many }`; `schema` unchanged; `toSchema` and the loader unchanged on the wire
- [ ] Every call site and the skill's `dsl-api.md` and generated references updated; no `returns: { schema` left in the tree
- [ ] `bash scripts/verify-all.sh` green

## Comments
