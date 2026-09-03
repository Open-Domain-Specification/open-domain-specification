---
column: backlog
labels: [frontend, docs]
priority: high
updatedAt: 2026-09-04T05:00:00.000Z
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
