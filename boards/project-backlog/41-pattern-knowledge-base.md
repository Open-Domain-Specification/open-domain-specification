---
column: todo
labels: [backend, ddd, docs]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T04:30:00.000Z
---
# Pattern knowledge base in core, consumed by legend, doc generator, docs site and skill (RFC-002 card C)

One source of truth for what each strategic pattern means: name, abbreviation, category, a one-line summary, the architectural nature and trade-offs. RFC-001 section 4 has the content (docs/rfcs/rfc-001-context-relationship-narratives-and-notes.md); RFC-002 section 7 fixes where it lives. The pages designs currently carry a stand-in map, `PATTERN_SUMMARIES` in packages/pages/src/lib/evidence/fixtures.ts, which this card replaces.

## Checklist

- [ ] `packages/core/src/patterns.ts`: `PatternNature { name, abbreviation, category: "relationship" | "upstream-role" | "downstream-role", summary, architecturalNature, tradeOffs: string[] }` and `PATTERNS: Record<ContextRelationshipType | UpstreamRole | DownstreamRole, PatternNature>` with the nine entries from RFC-001 section 4 (including `upstream-downstream`), exported from the package index; a test that every union member has an entry and every abbreviation is unique
- [ ] `packages/pages/src/lib/flow/legend.ts` derives its mark-to-label map from `PATTERNS` (mark = abbreviation, label = name); legend tests updated; `PATTERN_SUMMARIES` in the evidence fixtures removed and its importers read `PATTERNS[...].summary`
- [ ] The existing `title` tooltips on type chips and role badges (ContextPage.svelte and ContextEdge.svelte) show `summary`
- [ ] `packages/doc`: the bounded context page prints the summary under each role in its relationship table (or as a footnote list), tests updated, four models rebuilt
- [ ] `apps/docs/docs/2-ddd/3-strategic-design.md` gains a "Relationship patterns" section generated or hand-written from `PATTERNS`, naming OHS, ACL, PL, CF and the five relationship types
- [ ] `packages/skill` reference on strategic relationships regenerated from `PATTERNS` so an agent explains a pattern in the same words the UI does
- [ ] Root `npm test` green; pages coverage thresholds unchanged

## Comments

- **lead** (2026-09-04T04:30:00.000Z): Assigned to dev-opus. Fixed by decision: the content is RFC-001 section 4 verbatim, with the `upstream-downstream` entry from RFC-001 revision 2 (abbreviation `U/D`); trim adjectives if you must, add no claims. Abbreviations must match the marks the legend already draws (`U/D`, `C/S`, `P`, `SK`, `SW`, `OHS`, `ACL`, `PL`, `CF`). The docs-site section is the one place the trade-offs appear in full; everywhere else uses `summary`. Extension card 22 is in flight on ContextPage.svelte's table and packages/doc's context page: keep your edits in those two files to the tooltip and the footnote so the merge is easy, and merge develop before you finish. Work in your worktree; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
