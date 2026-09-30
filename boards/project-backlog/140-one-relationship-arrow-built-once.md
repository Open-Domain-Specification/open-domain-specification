---
column: done
labels: [pages, core]
priority: low
agent: developer
live: false
updatedAt: 2026-09-29T16:20:39.000Z
---
# One relationship arrow, built once

Issue #44, a child of epic #62. The glyph between a relationship's two contexts was written twice: in `relationshipTitle` in core, and again in `HealthReport.svelte`, which builds its label from two context lockups so that each end stays its own link. `RelationshipDetail.svelte` carried a third copy. A change to the glyph in core would not have reached either page. Core now exports `relationshipArrow(type)`, `relationshipTitle` is built from it, and both components compose `lockup + relationshipArrow + lockup`. The rendered labels are unchanged on every surface; this moves where the string is built, and the health report keeps each context as its own link.

## Checklist

- [x] Core test pinning `relationshipArrow` for directed and symmetric types, and that `relationshipTitle` puts it between the two contexts
- [x] Pages test: the health report's label text equals `relationshipTitle` for a directed and a symmetric relationship, and both ends are separate links to their contexts
- [x] `relationshipArrow` exported from core's `relationship.ts`; `relationshipTitle` built from it
- [x] `HealthReport.svelte` and `RelationshipDetail.svelte` use it; no glyph literal remains in pages, graphviz, doc or apps source outside core and test fixtures
- [x] Drift shown: changing the core glyph moves the title test and the health-report test together
- [x] Pages coverage stays at 100%; `svelte-check` clean

## Gates

- [x] `npx @biomejs/biome check` on the touched files exits 0 (root `biome check .`: no fixes, 2026-09-29)
- [x] `bash scripts/verify-all.sh` green on c3ae0910 (lead, 2026-09-29): core 1040, graphviz 35, doc 44, pages 906 at 100% coverage, pages e2e passed including `cross-surface-facts`, every model suite at its pinned count, schema comparison match

## Comments

- **developer** (2026-09-29T22:00:00.000Z): The glyph now lives at `packages/core/src/relationship.ts:22`, and `relationshipTitle` at `:33` calls it. `packages/pages/src/lib/organisms/HealthReport.svelte:98` and `RelationshipDetail.svelte:80` render it between the two `ContextLockup`s. `isSymmetricRelationship` stays where the components need the predicate for its own sake (`RelationshipDetail.svelte`'s role columns). No other source surface hard-codes the glyph: `packages/doc`, `packages/graphviz`, `apps/*` and the extension read `relationshipTitle` or the predicate, so there is no recorded exception. The remaining literals are in test harnesses and stories (`Disposition.harness.svelte`, `HoverCard.harness.svelte`), which are fixtures that stand for what a page draws.
- **developer** (2026-09-29T22:00:00.000Z): Tests. `packages/core/src/relationship.test.ts:52` pins both arrows and the title. `packages/pages/src/lib/organisms/HealthReport.test.ts:78` renders the petstore and the edge-case workspace, finds every intent cell, rebuilds its text from the two `.name` lockups and the `.arrow`, and looks it up among `relationshipTitle` of the workspace's relationships. It then requires exactly two links, with the source and target names and `ref` hrefs, and that both a directed and a symmetric arrow were seen.
- **developer** (2026-09-29T22:00:00.000Z): Drift shown. With the fix in place, the core glyph was temporarily changed to `<->` and `->`: the three core tests that pin the literal glyph failed (`relationshipTitle` twice, `relationshipArrow` once) and the health-report test's title comparison for every cell still held, so the two moved together; its only failure was a literal-glyph assertion on the set of arrows seen, which was then replaced by a count of two distinct arrows so the test states no glyph of its own. With the old duplicated glyph restored in `HealthReport.svelte` and the core glyph changed, the health-report test failed with "no relationship is titled \"Catalog BC ↔ Inventory BC\"". Both experiments were reverted; the tree carries the real glyphs.
- **developer** (2026-09-29T22:00:00.000Z): No generated Markdown moves: `relationshipTitle` returns the same string for every input, and no model docs were regenerated.
- **lead** (2026-09-29T23:30:00.000Z): Integrated on the epic 62 branch in the epic's order (#44, #43, #55, #56, then the cross-surface pass). The landing gate passed on c3ae0910, and `npm run test:vscode` passed on the same commit in real VS Code 1.96.4: cross-surface 4 passing, hostile-links 1, petstore 9 (4 pending screenshots). The card stays in `doing` until PR 73 merges.
- **lead** (2026-09-30T09:00:00.000Z): Landed. The owner reviewed PR #73 and merged it into develop as 9bb24cc, and post-merge CI run 36594778877 is green (test, e2e). Issue #44 closed; the card moves to `done`.
- **lead** (2026-09-29T16:20:39.000Z): Correction to the two lead entries above. They carry timestamps the lead wrote by hand, not the times the events happened. The entry stamped 2026-09-29T23:30:00.000Z was committed at 2026-09-29T15:35:38Z (commit 23fefaf). The entry stamped 2026-09-30T09:00:00.000Z was committed at 2026-09-29T16:11:34Z (commit a1eb80f). PR #73 merged at 2026-09-29T16:02:27Z, not on 2026-09-30. The entries stay as written; this entry and every later one use actual times.
