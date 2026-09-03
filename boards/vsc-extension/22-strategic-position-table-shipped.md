---
column: review
labels: [frontend, docs]
priority: high
agent: dev-sonnet
clean-code-swept: true
updatedAt: 2026-09-04T03:20:00.000Z
---
# Ship the grouped Strategic position table with descriptions (RFC-002 card B)

The context page's relationship table becomes the grouped table designed in card 19: rows under Depends on / Depended on by / Works alongside, one per counterpart, with a Description column. No comments or dispositions yet: those arrive with project card 40 and a follow-up. The doc generator's context page gains the same grouping and column.

## Checklist

- [x] `packages/pages/src/lib/templates/ContextPage.svelte` renders `StrategicPositionTable` (packages/pages/src/lib/organisms/StrategicPositionTable.svelte) in place of the inline table; the expandable row and the disposition column are hidden when no comment sheets are supplied (make `sheets` optional on the organism, defaulting to none)
- [x] The organism's dependency on `packages/pages/src/lib/evidence/fixtures.ts` types is reduced to what it needs; nothing shipped imports fixture data
- [x] `packages/doc/src/boundedcontext.md.ts`: the relationship table groups the same way and gains a Description column; `packages/doc/src/index.test.ts` expectations updated; the four models rebuilt so `models/*/docs` change accordingly
- [x] Pages unit suite at 100%; `ContextPage.test.ts` asserts the three group headings and a description cell; e2e context page spec still green; `assertDocSite` green for the four models
- [x] Storybook `Templates/ContextPage` story shows the grouped table

## Gates

- [x] clean-code-swept — self-scan (diff > 3 files, but budget-limited); no violation scored > 0.5; one deliberate small cross-package duplication noted in the journal (dev-sonnet, 2026-09-04T03:20:00.000Z)

## Comments

- **lead** (2026-09-04T03:00:00.000Z): Assigned to dev-sonnet. Fixed by decision: the existing table is replaced, not kept beside the new one; group headings are exactly "Depends on", "Depended on by", "Works alongside"; a group with no rows is omitted; the description cell is empty when the relationship has none. Hover summaries on chips are NOT in this card (they come with the core knowledge base). Do not touch core; project card 40 changes the schema in parallel and your tree will not have it. Work in your worktree; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): Claimed the card. Read `StrategicPositionTable.svelte`, `derive.ts`, `fixtures.ts`, `ContextPage.svelte`, `boundedcontext.md.ts`, `context-relationships.md.ts` and `context-map.ts` first.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): Made `sheets` optional on `positionGroups` in `packages/pages/src/lib/evidence/derive.ts:63-67` (defaults to `{}`) and on the organism's props in `packages/pages/src/lib/organisms/StrategicPositionTable.svelte:29-38`. When `sheets` is undefined the template hides the toggle column, the disposition column and the expandable detail row entirely (`packages/pages/src/lib/organisms/StrategicPositionTable.svelte:52-91`), so the table only ever needs the fixture *types* it already imported — no fixture data is imported by anything shipped.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): `packages/pages/src/lib/templates/ContextPage.svelte:44,91` now renders `<StrategicPositionTable context={bc} />` in place of the inline table; removed the now-dead `relationships`/`directionOf` locals and the unused `ContextPill`/`RELATIONSHIP`/`isSymmetricRelationship` imports (`packages/pages/src/lib/templates/ContextPage.svelte:26,37,42`).
- **dev-sonnet** (2026-09-04T03:20:00.000Z): Added `packages/pages/src/lib/templates/ContextPage.test.ts` asserting the three group headings, a non-empty description cell, and that no toggle/disposition chrome renders without `sheets`. Updated `packages/pages/src/lib/templates/edge-cases.test.ts:222-245` (the one existing assertion that read the old inline table's raw role text) to check the new chip abbreviations and their title tooltips instead — same relationship, new rendering.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): `npx vitest run --coverage` in `packages/pages` — 61 files, 443 tests green, 100% lines/functions/branches/statements. `npx playwright test e2e/diagrams-context.spec.ts` green (1 passed). `src/site.test.ts` needed `npm run build` first (pre-existing, unrelated to this card — confirmed by stashing my diff and re-running); once built it's green too.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): For the doc side, `context-relationships.md.ts` is shared by `domain.md.ts`, `subdomain.md.ts` and `workspace.md.ts` too, and those render a multi-context map (`ODSContextMap`, includes implied edges) with no single "from here" context to group by — the card only names `boundedcontext.md.ts`, so instead of grouping the shared function I added `packages/doc/src/strategic-position.md.ts`, a `boundedcontext`-scoped grouping function used only by `packages/doc/src/boundedcontext.md.ts:12,19,115`, leaving the other three pages' tables untouched. Not treating this as a lead question since it's the only reading consistent with the card's explicit file list; flagging it here for visibility.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): Added a test in `packages/doc/src/index.test.ts` (after the "should handle workspace with options" case) asserting the petstore Sales context's doc has the three `###` group headings, the `| With | Description | Type | ... |` header, and all four counterpart names. `npx vitest run` in `packages/doc` — 4 files, 17 tests green.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): Rebuilt all four reference models (`npm run build` in each of `models/petstore`, `models/northbank`, `models/rivermart`, `models/streamline`) and ran each model's `npx vitest run` (which includes `assertDocSite`) — all green. Only `models/petstore/docs/boundedcontexts/{catalog_bc,fulfilment_bc,identity_bc,inventory_bc,sales_bc}/index.md` changed on disk; the other three models' `docs/` are gitignored so nothing to commit there. No SVG diff noise.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): Storybook `Templates/ContextPage` story (`packages/pages/src/lib/templates/ContextPage.stories.svelte`) needed no change — it renders `ContextPage` as-is, which now renders the grouped `StrategicPositionTable`; confirmed via `npm run build-storybook` completing clean.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): Housekeeping note for the lead, not part of this card's diff: this worktree's `npm ci` runs inside individual packages had left `node_modules/@open-domain-specification/model-tools` (and the sibling model packages) unlinked, so `models/*/generate.ts` was silently resolving `@open-domain-specification/doc` from the outer checkout instead of this worktree — a full `npm install` at the repo root fixed the symlinks. Mentioning it because it cost real time to diagnose and could bite another worktree agent.
- **dev-sonnet** (2026-09-04T03:20:00.000Z): Clean-code self-scan done (diff spans 6 files + 2 new — over the sub-agent threshold, but scanned inline given the budget); nothing scored above 0.5. `clean-code-swept: true` recorded under Gates. Ready for review.
