---
column: todo
labels: [frontend, docs]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T06:30:00.000Z
---
# Relationship detail in place and as its own page (RFC-002 card E)

The relationship detail designed in card 19 ships: expanded in place from a Strategic position row, and as a standalone page reachable from the tree, search, the context page and the map edge. Comments and dispositions now come from core (project card 40) and pattern summaries from core (project card 41); the provisional types in packages/pages/src/lib/evidence/fixtures.ts go away.

## Checklist

- [ ] `packages/pages/src/lib/evidence/` reads `comments` and `disposition` from the core model elements; `NoteSheetIndex`/`CommentSheetIndex`, `relationshipKey`, `sheetFor*` and the petstore overlay fixture are deleted; stories use the petstore model's real comments
- [ ] `StrategicPositionTable` on the context page shows the disposition column and the expand toggle when any relationship carries comments or a disposition; the expanded row renders `RelationshipDetail`
- [ ] A relationship ref (`#/relationships/<n>` or a stable key, decide with the lead if core has no id) routes to a `RelationshipPage` template rendering `RelationshipDetail` standalone; `elements.ts` and search index it; the extension tree's relationship nodes get that ref so clicking opens the page
- [ ] `ConsumablePage` gains the comments list and a disposition chip
- [ ] `packages/doc`: the bounded context page prints each relationship's comments (text plus link) beneath its row or as a per-relationship section, and the consumable page prints its comments
- [ ] Pages unit suite at 100%; an e2e case that expands a row on the petstore Sales page and one that opens the relationship page from the tree in `npm run test:vscode`
- [ ] The "participant" chips on symmetric relationships in `RelationshipDetail` are removed

## Comments

- **lead** (2026-09-04T06:30:00.000Z): Assigned to dev-opus. Fixed by decision: (1) a relationship's ref is `#/relationships/<source.id>~<type>~<target.id>` (the key card 19 already used), exposed as a `ref` getter on `ContextRelationship` in core, with `workspace.findRelationship(ref)` beside it; that is the only core change. (2) The page is `RelationshipPage` in packages/pages/src/lib/templates, registered in `elements.ts` with the icon the tree uses, so search and the tree open it; the extension tree's relationship nodes get that ref. (3) `RelationshipDetail` drops the "participant" chips on symmetric relationships; the role cards on a symmetric relationship show just the two contexts and the pattern summary once, above them. (4) Comments in the doc generator render as a bullet list under the relationship's row group in strategic-position.md.ts and under the consumable's header, text then link as `[label](url)`. (5) Delete every provisional type and fixture in packages/pages/src/lib/evidence that core now provides; keep only what derives views (positionGroups, health, crossingConsumables, relationshipLinks) and the density fixture used by the eight-relationship stories. Tests that prove it: pages unit at 100%, the e2e cases in the checklist, `npm run test:vscode` for the tree, doc tests, `assertDocSite` for the four models. Run suites from inside your worktree with absolute paths; a root `npm test` replays the main tree's cache and is not evidence. Work in your worktree; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
