# RFC-002: Intent and Evidence — showing reality inside the domain model

- **Status**: Proposed (surfaces first; data model deliberately provisional)
- **Authors**: Jonathan Turnock, Claude (tech lead), with the product-owner review of RFC-001
- **Created**: 2026-09-03
- **Supersedes**: [RFC-001](rfc-001-context-relationship-narratives-and-notes.md)
- **Related ADRs**: [decisions/03](../../decisions/03-explicit-context-relationships.md), [decisions/09](../../decisions/09-consumables-plus-schemas.md), [decisions/11](../../decisions/11-agent-skill-package.md), [decisions/12](../../decisions/12-one-renderer-three-hosts.md)
- **Target Areas**: `@open-domain-specification/pages` first (Storybook designs), then `core`, `doc`, `skill`

---

## 1. The idea in one paragraph

A DDD model is an atlas. It says *there is an anti-corruption layer between Sales and Catalog* and stops there. That is the right level for almost every reading of the map. But the model is also a claim about a real system, and readers regularly need to check the claim: is the ACL built, where is it, who owns it, when did someone last look? Today the model cannot hold that, so the UI cannot show it, and "why is there an ACL here" has no answer anywhere. This RFC adds a second layer, **evidence**, beneath the strategic **intent**, and shows it on the same pages the reader is already on: disclosed on hover and on click, never on a separate zoom level, plus one workspace-level **health report** that reads the whole layer at once. The AI skill becomes the thing that bridges the two layers: it goes and looks at the codebase and helps the author tell the true story.

RFC-001's sentence generator, per-role notes and popovers are dropped. Its pattern knowledge base survives as the "what this pattern means" text that every disclosure carries.

---

## 2. Vocabulary

- **Intent**: everything the model says today. Relationships, roles, consumables, patterns, aggregates, invariants.
- **Evidence**: facts about the real system that back or contradict an intent: a link to the code, the contract, the decision record; who verified it and when; free text as a last resort.
- **Health**: a derived judgement about one intent given its evidence, expressed as a status label (section 3).
- **Disclosure**: how evidence appears on a page. A hover shows a summary; a click opens the full detail in place, on the same page. Nothing navigates away, nothing zooms.

---

## 3. Status labels (open for refinement)

The first cut, `intended / in-place / drifted`, mixed two axes: whether a thing is built, and whether we know. The labels below separate them. Authors set the first axis; the second is derived from the evidence attached, so nobody types "verified" by hand.

| Axis | Label | Meaning | Set by |
| :--- | :--- | :--- | :--- |
| Delivery | **planned** | The intent is agreed but nothing implements it yet | author |
| Delivery | **live** | The intent is implemented in the running system | author (default once evidence exists) |
| Delivery | **retired** | Was live, no longer is; kept for history | author |
| Confidence | **unverified** | No evidence attached | derived |
| Confidence | **verified** | Evidence attached with a date and a name | derived |
| Confidence | **stale** | Verified, but longer ago than the workspace's staleness window (default 90 days) | derived |
| Confidence | **contradicted** | Evidence was checked and disagrees with the intent | derived, usually by the skill |

A page shows one chip per axis, and only when it says something: a live, verified relationship shows nothing extra at atlas level; a planned or contradicted one shows a chip. Questions to settle in review: are three delivery labels enough (is *deprecated* needed), and is *stale* a label or just a rendering of *verified* with an old date?

---

## 4. Surfaces

Each surface is designed in Storybook against fixture data before any schema work (section 8). The fixtures give three petstore relationships different health so every state is visible.

### 4.1 Context page: Strategic position

The table stays and becomes the primary view of relationships. Three changes:

- Rows group by the viewpoint context: **Depends on**, **Depended on by**, **Works alongside**. One row per counterpart.
- A **Description** column shows the relationship's own description, which the model already carries and no surface prints today.
- Each role chip (`OHS`, `ACL`, ...) and each type chip gets a hover summary: one line on what the pattern means (from the knowledge base) plus the evidence summary if any. A click on the row expands it in place into the relationship detail (4.3).

Health chips sit at the end of the row and only appear when they carry information (planned, contradicted, stale, unverified when the workspace opts into strictness).

### 4.2 Context map and consumable map

No new panel. Edges and port badges gain the same hover summary as the chips. When the intent under a badge is planned, the badge is outlined instead of filled; when contradicted, it carries the warning colour; when stale, it dims. A click on a badge opens the same in-place detail as 4.3 as a floating card anchored to the badge, inside the diagram so it survives fullscreen. The legend gains one row per health mark it draws.

### 4.3 Relationship detail (in-place disclosure and its own page)

The same block serves both as the expanded row on a context page and as a standalone page reachable from the tree, search and the map edge. Content, top to bottom:

1. Title: `Catalog BC → Sales BC`, type chip, health chips.
2. The description, verbatim.
3. Roles, one card per side, each with: the pattern name and abbreviation, the knowledge-base summary, the evidence for that role (links by kind, verified by and when, notes).
4. The consumables that cross this boundary, each with its own pattern and health, linking to the consumable page.
5. Decision links (ADRs) and code links, deduplicated across the roles.

On docsify the same block renders as markdown with the links inline; the hover summaries become the visible text. This is the test that the feature is content, not a widget.

### 4.4 Consumable page

Already exists. Gains: the pattern's knowledge-base summary under the pattern chip, an evidence block (same shape as 4.3 point 3), and health chips in the header.

### 4.5 Health report (workspace page)

A section on the workspace page, and its own route, listing every intent with a health that says something:

- **Contradicted** first, with what the evidence says.
- **Planned**, grouped by counterpart context, so a roadmap falls out of the model.
- **Stale**, oldest first.
- **Unverified**, collapsed by default; expanded when the workspace opts into strictness.

Each row links to the intent's page and shows the last verification. A summary strip at the top gives counts per label, which is what a product owner reads to answer "is the map true?". The tree shows the same counts on the workspace node.

### 4.6 Problems panel and validation

One new rule family, opt-in per workspace: `evidence-required` warns on unverified strategic intents, `evidence-stale` warns on stale ones, `evidence-contradicted` errors. They surface in the Problems panel like every other rule, mapped to the JSON position, so health is visible in the editor without opening a page.

---

## 5. The skill bridges the layers

The skill already interviews the author and validates the model. It gains a third job: **reconciliation**.

- **On request** ("check the model against the code"): for each strategic intent, search the repository for its evidence. An ACL should have an adapter or translator on the downstream side; an OHS should have a published contract; a shared kernel should have a shared package. Attach links and a verification for what it finds; mark contradicted what it can show is absent or different; leave unverified what it cannot decide, with a note saying what it looked for.
- **During the interview**: one question per new strategic intent, "is this in place or planned?", and if in place, "where does it live?", accepting a path or a URL. No per-role note question.
- **Health-driven prompts**: when opening a workspace with contradicted or stale intents, offer to reconcile them first.

This is the product's differentiator: a copilot that knows the model is a claim and helps keep it honest.

---

## 6. What is deliberately not decided yet

- The evidence schema. The surfaces above imply a shape (links by kind, verified-by and date, delivery status, notes) but it is pinned only after the Storybook designs are reviewed.
- Where evidence lives for each element kind: inline on the relationship and consumable, or a separate `evidence` array keyed by ref. The health report and the Problems rules would prefer the latter; the DSL would prefer the former.
- The staleness window default and whether it is per workspace.
- Whether aggregates and invariants carry evidence in the first release or only strategic intents.

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
| D | Evidence schema, DSL, JSON schema, reference models, health derivation | core, models | after A is reviewed; `feat!:` |
| E | Relationship detail and page; tree and search reach it; consumable page evidence | pages, doc, extension | |
| F | Map health marks and badge disclosure | pages | |
| G | Health report and Problems rules | pages, core, extension | |
| H | Skill reconciliation and interview questions | skill | |

Card A is the only one started by this RFC. Everything after B waits for the design review.

---

## 9. Decisions carried over from the RFC-001 review

- A relationship needs a page of its own. Popovers on a context page cannot substitute for it.
- Per-role free-text notes are not captured; evidence is typed and attached where the fact lives.
- Generated prose is not the primary view. The grouped table with descriptions is.
- Anything that only pages can render is secondary; the feature is data plus markdown first, so docsify and the skill see the same thing.
- The legend panel overlapping the Catalog node on the map is a separate defect, logged as an extension card.
