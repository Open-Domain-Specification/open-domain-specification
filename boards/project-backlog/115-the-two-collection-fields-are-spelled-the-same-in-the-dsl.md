---
column: review
labels: [backend]
priority: low
agent: developer-lite
live: false
clean-code-swept: true
updatedAt: 2026-09-06T00:00:00.000Z
---
# The two collection fields are spelled the same in the DSL

Card 114 gave a request `many` the way an answer has it, and the DSL now spells the two differently: `schema: { of, many }` on the request and `returns: { schema, many }` on the answer. The wire format is `{ $ref, many }` for both. Align both on `{ of, many }`; five call sites (`models/petstore/src/workspace.ts`, three test or fixture files, one docs example) and the skill's DSL reference.

## Checklist

- [x] `ConsumableAttributes.returns` takes `{ of, many }`; `schema` unchanged; `toSchema` and the loader unchanged on the wire
- [x] Every call site and the skill's `dsl-api.md` and generated references updated; no `returns: { schema` left in the tree
- [x] `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — mechanical field rename, no code smells introduced; swept all call sites (developer-lite, 2026-09-06T00:00:00.000Z)
- [x] verify-all — `bash scripts/verify-all.sh` green end to end, 1640+ tests across all packages plus e2e, schema comparison (petstore vs core dist) match (developer-lite, 2026-09-06T00:00:00.000Z)

## Comments

- **developer-lite** (2026-09-06T00:00:00.000Z): Renamed `ConsumableAttributes.returns` to `{ of, many }` in packages/core/src/workspace.ts:1394 (type) and packages/core/src/workspace.ts:1462-1464 (constructor), matching the request field's `{ of, many }` shape from card 114. Found and fixed a sixth call site the brief didn't list: the schema loader in packages/core/src/workspace-from-schema.ts:246, which built `{ schema: returns, many }` when reconstructing a workspace from JSON — the wire format itself (`{ $ref, many }`) is unchanged, only this DSL-shaped intermediate object. Swept the five named call sites: models/petstore/src/workspace.ts:424, packages/core/src/workspace.test.ts:604, packages/core/src/validate.test.ts:6569, packages/doc/src/index.test.ts:183, packages/pages/src/lib/fixtures.ts:199. Updated packages/skill/skill/references/dsl-api.md:39 (hand-written) and packages/skill/skill/references/interview-playbook.md:209 and translation-table.md:55 (also hand-written, not part of the generate script's output) and re-ran `npm run build -w packages/skill` to regenerate model-reference.md/validation-rules.md, which had no stale occurrences. `bash scripts/verify-all.sh` passed green (core 710, doc 31, skill 26, petstore 22, pages 764, plus e2e, schema comparison match). `git diff --stat -- models/*/.ods` is empty — no model output changed on the wire.
