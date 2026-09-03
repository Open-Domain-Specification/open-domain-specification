---
column: todo
labels: [frontend, docs]
priority: high
agent: dev-opus
updatedAt: 2026-09-03T23:40:00.000Z
---
# Storybook designs for the intent-and-evidence surfaces (RFC-002 card A)

Design, in Storybook only, the five surfaces in docs/rfcs/rfc-002-intent-and-evidence.md section 4, against fixture data. No schema change, no change to shipped pages: the point is to see the UI before the evidence data model is pinned. Read the RFC in full first, then packages/pages/src/lib/templates/ContextPage.svelte, ContextPage.stories.svelte, packages/pages/src/lib/fixtures.ts, the flow legend, PortBadge.svelte and ContextEdge.svelte.

## Checklist

- [ ] Provisional types in `packages/pages/src/lib/evidence/fixtures.ts` only: `Evidence { links: {kind: "code"|"contract"|"adr"|"runbook"|"dashboard", url, label?}[], verifiedBy?, verifiedAt?, notes? }`, `Delivery = "planned"|"live"|"retired"`, `Confidence = "unverified"|"verified"|"stale"|"contradicted"`, and a `healthOf(evidence, now, staleDays)` that derives Confidence; unit tested
- [ ] Petstore fixture overlay giving the five relationships different health: Catalog→Sales live+verified, Sales→Inventory live+stale, Sales–Fulfilment planned, Sales–Identity live+contradicted, Catalog–Inventory live+unverified
- [ ] `HealthChip` atom (one per axis, only renders when it says something) with stories in every state, light and dark
- [ ] `StrategicPositionTable` molecule: grouped rows (Depends on / Depended on by / Works alongside), Description column, role and type chips with hover summary, health chips at row end, row click expands in place; stories for a context with 1, 3 and 8 relationships
- [ ] `RelationshipDetail` organism (RFC 4.3, points 1-5) usable both expanded in a row and standalone; stories in every health state
- [ ] Context map story with health marks on badges (outlined for planned, warning colour for contradicted, dimmed for stale) and the click disclosure anchored inside the diagram; legend rows for the marks
- [ ] `HealthReport` organism (RFC 4.5) with the summary strip and the four sections; story against the fixture overlay
- [ ] `npm run build-storybook -w packages/pages` green; unit suite and coverage thresholds unchanged (new modules 100%)

## Comments

- **lead** (2026-09-03T23:40:00.000Z): Assigned to dev-opus. Fixed by decision: everything lives under `packages/pages/src/lib/evidence/` plus the atoms/molecules/organisms folders, and nothing is imported by a shipped template yet; stories only. Disclosure is hover for the one-line summary and click for the in-place detail, never a separate zoom or route. Hover summaries use a small inline `PATTERN_SUMMARIES` map in the fixtures file (the core knowledge base comes in card C). Use existing atoms (Chip, RefLink, Fact, Card) before adding new ones. Status labels are the RFC section 3 set; render them as chips with the existing `--warn` for contradicted, `--muted` for stale, an outline chip for planned. Every component has a light and dark story and, where it lays out rows, an 8-relationship story so density is visible. You may choose the exact chip wording and the layout of the detail block; journal the alternatives you rejected. Do not write to core, doc or skill. If the card file is missing in your worktree, `git reset --hard develop` there first; `npm ci` if node_modules is missing.
