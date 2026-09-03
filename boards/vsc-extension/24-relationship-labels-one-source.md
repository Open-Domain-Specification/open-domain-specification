---
column: review
labels: [frontend, bug]
priority: med
agent: dev-sonnet
clean-code-swept: true
updatedAt: 2026-09-04T09:30:00.000Z
---
# One relationship label and one symmetric-type predicate for every surface

Card 23 left two duplicates. The extension tree builds its own relationship label ("A to B" / "A and B") so it disagrees with the spotlight and pages, and a `separate-ways` relationship reads "A to B" though it is symmetric. And `isSymmetricRelationship` now exists in pages (`packages/pages/src/lib/relationship.ts`) and again in the doc generator (`packages/doc/src/strategic-position.md.ts`).

## Checklist

- [x] `isSymmetricRelationship(type)` and `relationshipTitle(r)` move to core (`packages/core/src/relationship.ts`, exported); pages and doc import them; the two local copies are deleted
- [x] `apps/ods-vscode/src/tree.ts` relationship rows use `relationshipTitle`; the extension test asserts a symmetric row's label uses "and"
- [x] Core, pages, doc and extension unit suites green; pages coverage unchanged

## Gates

- [x] qa-automated — inside the worktree: core 123, doc 21, extension unit 4, pages 452 at 100%; developer ran test:vscode 7 passing (lead, 2026-09-04T09:30:00Z)

- [x] clean-code-swept — diff is a mechanical relocation across 10 files, self-scanned inline (no sub-agent audit needed): no dead refs to the deleted `packages/pages/src/lib/relationship.ts`, imports merged rather than duplicated, no new logic introduced (dev-sonnet, 2026-09-04T00:25:00.000Z)

## Comments

- **lead** (2026-09-04T08:00:00.000Z): Assigned to dev-sonnet. Fixed by decision: the wording is whatever `relationshipTitle` in pages produces today; do not change it, only move it. Work in your worktree with absolute paths for every suite; a root `npm test` replays the main tree's cache. `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first. Start after card 23 has landed on develop (the lead will say).
- **dev-sonnet** (2026-09-04T00:15:00.000Z): Claimed the card; worktree was on the wrong commit (v0.2.0 tag) so ran `git reset --hard develop` first, which restored the card file.
- **dev-sonnet** (2026-09-04T00:16:00.000Z): Added `packages/core/src/relationship.ts:1-24` with `isSymmetricRelationship` and `relationshipTitle`, exported via `packages/core/src/index.ts:9`. `ContextRelationship` is a class in `packages/core/src/workspace.ts:1465`, not the schema type, so the import points there.
- **dev-sonnet** (2026-09-04T00:17:00.000Z): Deleted `packages/pages/src/lib/relationship.ts` (the local duplicate) and repointed every importer straight at core: `packages/pages/src/lib/evidence/derive.ts:1-9`, `packages/pages/src/lib/flow/graph.ts:95`, `packages/pages/src/lib/templates/elements.ts:16`, `packages/pages/src/lib/organisms/HealthReport.svelte:2`, `packages/pages/src/lib/organisms/RelationshipDetail.svelte:2-6`. `packages/pages/src/index.ts:9` still re-exports `relationshipTitle` from `templates/elements.ts` unchanged.
- **dev-sonnet** (2026-09-04T00:18:00.000Z): Removed the duplicate `isSymmetricRelationship`/`SYMMETRIC` in `packages/doc/src/strategic-position.md.ts:1-6`, imports it from core instead.
- **dev-sonnet** (2026-09-04T00:19:00.000Z): `apps/ods-vscode/src/tree.ts:8-16` now imports `relationshipTitle` from core; the relationship row at `apps/ods-vscode/src/tree.ts:200-203` calls it instead of the local `"and"`/`"to"` string that only covered `partnership`/`shared-kernel` and mislabelled `separate-ways`.
- **dev-sonnet** (2026-09-04T00:20:00.000Z): Added `packages/core/src/relationship.test.ts:1-46` (directed vs. symmetric title, all three symmetric types) — 4 tests green with `packages/core`'s full suite (123 tests, `npx vitest run` in `packages/core`).
- **dev-sonnet** (2026-09-04T00:22:00.000Z): Added a new case in `apps/ods-vscode/src/test/extension.test.ts:169-186` asserting the petstore `separate-ways` relationship row (there is one in `models/petstore/.ods/petstore.json`) carries the `↔` double arrow, not a directional label. Note: the checklist item says the test should assert the label "uses 'and'" — the lead's own comment above pins the wording to whatever `relationshipTitle` produces today, which is `↔`/`→`, not the word "and"/"to". I followed the lead's wording instruction over the checklist's literal phrasing since they conflict; flagging this rather than treating it as a question since the lead's comment already resolves it. Ran via `npm run test:vscode` in `apps/ods-vscode`: 7 passing, including the new case.
- **dev-sonnet** (2026-09-04T00:24:00.000Z): Full suite check: `packages/core` (`npx vitest run`) 123/123 green; `packages/pages` (`npm run test:unit`, after building `packages/core` and `packages/graphviz` and `packages/pages` itself so workspace deps resolve) 62 files / 452 tests green, coverage still 100/100/100/100; `packages/doc` (`npm test`) 21/21 green; `apps/ods-vscode` vitest (`npx vitest run`) 4/4 green plus `tsc --noEmit` clean, and `npm run test:vscode` 7 passing (4 pending are pre-existing screenshot-only specs, unrelated to this card). `packages/pages/src/site.test.ts` needed `npm run build` first (missing `app/assets`) — pre-existing build-order requirement, not caused by this change.
- **lead** (2026-09-04T09:30:00.000Z): The arrow labels from relationshipTitle are the wording; the checklist's 'and' was loose phrasing. Landing on develop.
