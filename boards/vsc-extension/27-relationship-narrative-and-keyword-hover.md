---
column: todo
labels: [frontend, ddd]
priority: high
agent: dev-opus
updatedAt: 2026-09-04T10:00:00.000Z
---
# Templated relationship narrative and keyword hover that discloses the comments

Two things on the Strategic position table and the relationship page.

1. **Narrative**: a templated one-line sentence per relationship, written from the viewpoint context, generated in core by `relationshipNarrative(relationship, viewpoint)` using the rules in docs/rfcs/rfc-001-context-relationship-narratives-and-notes.md section 5 (revision 2: named slots, empty-role clauses, both-roles clauses, symmetric templates). It is the Description cell when the author wrote no description, rendered muted so a reader can tell it is generated, and it is the hover text of the row's counterpart pill in every case.
2. **Keyword hover**: hovering a pattern keyword (a role chip such as `OHS` or `ACL`, or the type chip such as `customer-supplier`) opens a small hover card, not a title tooltip: the pattern name and one-line summary from core's `PATTERNS`, then the intent's disposition chip and its comments with links. Click pins the card (Escape or click outside closes); keyboard focus opens it too. The same hover card component is used by the relationship page's role cards.

## Checklist

- [ ] `packages/core/src/narrative.ts`: `relationshipNarrative(r, viewpoint): NarrativeSegment[]` (text, context and pattern segments as RFC-001 rev 2 section 5 defines) with a `narrativeText()` flattener; tests over every permutation: directed both viewpoints x both types x role combinations (none, one, both on each side), and the three symmetric types
- [ ] `StrategicPositionTable`: Description cell falls back to the narrative (muted, with a title "generated"); counterpart pill title is the narrative text
- [ ] `molecules/PatternHoverCard.svelte` with state in `hover-card.svelte.ts` (open on hover after 150 ms and on focus, pin on click, close on Escape and outside click, one open at a time); pattern chips in the table and on `RelationshipDetail` role cards use it
- [ ] Doc generator: the Description cell falls back to `narrativeText` in italics; the four models rebuilt
- [ ] Storybook stories for the hover card in every state (no comments, comments, tolerated, refactor), light and dark; `e2e/storybook.spec.ts` covers them
- [ ] Pages unit at 100%; one e2e case: hover `ACL` on the petstore Sales page and see the anti-corruption-layer summary and the ACL comment text; press Escape and it is gone
- [ ] Docs: `apps/docs/docs/8-pages.md` (or the pages page) mentions the narrative fallback and the hover cards

## Comments

- **lead** (2026-09-04T10:00:00.000Z): Assigned to dev-opus. Fixed by decision: the narrative is a fallback and a hover, never a paragraph block on the page; wording is RFC-001 revision 2 section 5 verbatim, including the rule-5 aside for implied relationships. The hover card is one component for table chips and role cards; it renders inside the page flow (position absolute under the chip), not in a portal, and never on the map (card 25 owns the map). Do not touch ContextEdge, InteractiveDiagram, WorkspacePage or the tree: cards 25 and 26 are in flight there. Merge develop before your final run. Work in your worktree with absolute paths for every suite; `npm ci` there first if node_modules is missing; if the card is missing, `git reset --hard develop` there first.
