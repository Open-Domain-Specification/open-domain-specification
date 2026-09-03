# RFC-002: Intent and Evidence — showing reality inside the domain model

- **Status**: Proposed (surfaces first; data model deliberately provisional)
- **Authors**: Jonathan Turnock, Claude (tech lead), with the product-owner review of RFC-001
- **Created**: 2026-09-03
- **Supersedes**: [RFC-001](rfc-001-context-relationship-narratives-and-notes.md)
- **Related ADRs**: [decisions/03](../../decisions/03-explicit-context-relationships.md), [decisions/09](../../decisions/09-consumables-plus-schemas.md), [decisions/11](../../decisions/11-agent-skill-package.md), [decisions/12](../../decisions/12-one-renderer-three-hosts.md)
- **Target Areas**: `@open-domain-specification/pages` first (Storybook designs), then `core`, `doc`, `skill`

---

## 1. The idea in one paragraph

A DDD model is an atlas. It says *there is an anti-corruption layer between Sales and Catalog* and stops there. That is the right level for almost every reading of the map. But the model is also a claim about a real system, and readers regularly need to check the claim: is the ACL built, where is it, and is it there on purpose or waiting to be refactored out? Today the model cannot hold that, so the UI cannot show it, and "why is there an ACL here" has no answer anywhere. This RFC adds a second layer, **evidence**, beneath the strategic **intent**, and shows it on the same pages the reader is already on: disclosed on hover and on click, never on a separate zoom level, plus one workspace-level **health report** that reads the whole layer at once. The AI skill becomes the thing that bridges the two layers: it goes and looks at the codebase and helps the author tell the true story.

RFC-001's sentence generator, per-role notes and popovers are dropped. Its pattern knowledge base survives as the "what this pattern means" text that every disclosure carries.

---

## 2. Vocabulary

- **Intent**: everything the model says today. Relationships, roles, consumables, patterns, aggregates, invariants.
- **Evidence**: the comments on an intent: short grounded statements about the real system, each optionally linking to the code, the contract or the decision record.
- **Disposition**: one word on whether the intent is by design, tolerated, or due for refactoring (section 3).
- **Health**: the workspace-level view of every intent that is not by-design or has no comments (section 4.5).
- **Disclosure**: how evidence appears on a page. A hover shows a summary; a click opens the full detail in place, on the same page. Nothing navigates away, nothing zooms.

---

## 3. Comments (kept simple on purpose)

Evidence is **comments**: a short list of grounded statements about the architecture behind an intent, each optionally backed by a link. There is no lifecycle. No verified-by, no dates, no derived confidence, no staleness window. A comment stands until an author or the skill edits it, the same as every other line of the model.

```
comments:
  - "Shared PetStatus enum lives in @petstore/kernel, consumed by both services"   (link: code)
  - "Agreed in ADR-014; the kernel is deliberately tiny"                           (link: adr)
```

One optional label per intent says what the architecture thinks of it, because the most common question a reader has about a pattern on the map is *is this on purpose*:

| Disposition | Meaning |
| :--- | :--- |
| **by-design** | This is how it should be. Default when unset. |
| **tolerated** | Known compromise; not planned to change. Say why in a comment. |
| **refactor** | Should be removed or replaced; the comments say what it should become. |

A shared kernel marked *refactor* with the comment "duplicated pricing rules; move to a Published Language from Catalog" tells a reader more than any status machine would. Health (section 4.5) is simply the list of intents that are not by-design, plus intents with no comments at all.

---

## 4. Surfaces

Each surface is designed in Storybook against fixture data before any schema work (section 8). The fixtures give the petstore relationships different dispositions and comments so every state is visible.

### 4.1 Context page: Strategic position

The table stays and becomes the primary view of relationships. Three changes:

- Rows group by the viewpoint context: **Depends on**, **Depended on by**, **Works alongside**. One row per counterpart.
- A **Description** column shows the relationship's own description, which the model already carries and no surface prints today.
- Each role chip (`OHS`, `ACL`, ...) and each type chip gets a hover summary: one line on what the pattern means (from the knowledge base) plus the evidence summary if any. A click on the row expands it in place into the relationship detail (4.3).

A disposition chip sits at the end of the row only when the intent is tolerated or marked for refactoring; by-design intents show nothing extra.

### 4.2 Context map and consumable map

No new panel. Edges and port badges gain the same hover summary as the chips. When the intent under a badge is marked refactor, the badge carries the warning colour; when tolerated, it is outlined instead of filled; by-design badges are unchanged. A click on a badge opens the same in-place detail as 4.3 as a floating card anchored to the badge, inside the diagram so it survives fullscreen. The legend gains one row per health mark it draws.

### 4.3 Relationship detail (in-place disclosure and its own page)

The same block serves both as the expanded row on a context page and as a standalone page reachable from the tree, search and the map edge. Content, top to bottom:

1. Title: `Catalog BC → Sales BC`, type chip, disposition chip when not by-design.
2. The description, verbatim.
3. Roles, one card per side, each with: the pattern name and abbreviation, the knowledge-base summary, and the comments for that role (statements with their links).
4. The consumables that cross this boundary, each with its own pattern and disposition, linking to the consumable page.
5. Decision links (ADRs) and code links, deduplicated across the roles.

On docsify the same block renders as markdown with the links inline; the hover summaries become the visible text. This is the test that the feature is content, not a widget.

### 4.4 Consumable page

Already exists. Gains: the pattern's knowledge-base summary under the pattern chip, comments (same shape as 4.3 point 3), and a disposition chip in the header when not by-design.

### 4.5 Health report (workspace page)

A section on the workspace page, and its own route, listing what the architecture is not happy with:

- **Refactor**: every intent marked refactor, grouped by counterpart context, with its comments. This is the refactoring backlog the model implies.
- **Tolerated**: every accepted compromise, with the comment that justifies it.
- **No comments**: intents that carry no comments at all, collapsed by default. This is the reconciliation to-do list for the skill.

Each row links to the intent's page. A summary strip at the top gives the three counts, which is what a product owner reads to answer "is the map true, and is it what we want?". The tree shows the same counts on the workspace node.

### 4.6 Problems panel and validation

One new rule, opt-in per workspace: `comments-required` warns on strategic intents with no comments. They surface in the Problems panel like every other rule, mapped to the JSON position, so health is visible in the editor without opening a page.

---

## 5. The skill bridges the layers

The skill already interviews the author and validates the model. It gains a third job: **reconciliation**.

- **On request** ("check the model against the code"): for each strategic intent, search the repository for its evidence. An ACL should have an adapter or translator on the downstream side; an OHS should have a published contract; a shared kernel should have a shared package. Write comments with links for what it finds; where the code disagrees with the model, say so in a comment and propose a disposition; where it cannot decide, write a comment saying what it looked for and did not find.
- **During the interview**: one question per new strategic intent, "is this by design, or something you are living with?", and "where does it live?", accepting a path or a URL. No per-role note question.
- **Health-driven prompts**: when opening a workspace with intents that have no comments, offer to reconcile them first.

This is the product's differentiator: a copilot that knows the model is a claim and helps keep it honest.

---

## 6. What is deliberately not decided yet

- The comments schema. The surfaces above imply a shape (a list of statements with optional typed links, and one optional disposition) but it is pinned only after the Storybook designs are reviewed.
- Where evidence lives for each element kind: inline on the relationship and consumable, or a separate `evidence` array keyed by ref. The health report and the Problems rules would prefer the latter; the DSL would prefer the former.
- Whether aggregates and invariants carry comments in the first release or only strategic intents.

---

## 7. Knowledge base (kept from RFC-001)

`PATTERNS` in core: name, abbreviation, category, a one-line summary, the architectural nature, trade-offs. Consumed by the hover summaries here, by the pages legend, by the doc generator, by the docs site's strategic design page (which today never names OHS, ACL, CF or PL), and by the skill's reference.

---

## 8. Rollout

| # | Card | Package(s) | Notes |
| :--- | :--- | :--- | :--- |
| A | **Storybook designs** of 4.1, 4.2, 4.3, 4.4, 4.5 against fixtures with a provisional evidence type; review with the product owner | pages | first, no schema change |
| B | Context page: grouped table, Description column, hover summaries | pages, doc | can ship before evidence exists |
| C | `PATTERNS` in core; legend, doc generator, docs site, skill consume it | core, pages, doc, skill | |
| D | Comment sheet schema, DSL, JSON schema, reference models | core, models | after A is reviewed; `feat!:` |
| E | Relationship detail and page; tree and search reach it; consumable page evidence | pages, doc, extension | |
| F | Map disposition marks and badge disclosure | pages | |
| G | Health report and the comments-required rule | pages, core, extension | |
| H | Skill reconciliation and interview questions | skill | |

Card A is the only one started by this RFC. Everything after B waits for the design review.

---

## 9. Decisions carried over from the RFC-001 review

- A relationship needs a page of its own. Popovers on a context page cannot substitute for it.
- Per-role free-text notes are not captured; comments are short grounded statements with links, attached where the comment lives.
- Generated prose is not the primary view. The grouped table with descriptions is.
- Anything that only pages can render is secondary; the feature is data plus markdown first, so docsify and the skill see the same thing.
- The legend panel overlapping the Catalog node on the map is a separate defect, logged as an extension card.
