# RFC-001: Context Relationship Narratives, Role Notes, and Interactive UI Popovers

- **Status**: Superseded by [RFC-002](rfc-002-intent-and-evidence.md) on 2026-09-03 after the product-owner review; kept for the knowledge base (section 4) and the review decisions
- **Authors**: Jonathan Turnock, Antigravity
- **Created**: 2026-09-03
- **Related ADRs**: [decisions/03-explicit-context-relationships.md](../../decisions/03-explicit-context-relationships.md), [decisions/09-consumables-plus-schemas.md](../../decisions/09-consumables-plus-schemas.md), [decisions/12-one-renderer-three-hosts.md](../../decisions/12-one-renderer-three-hosts.md)
- **Target Areas**: `@open-domain-specification/core`, `@open-domain-specification/pages`, `@open-domain-specification/doc`, `@open-domain-specification/skill`
- **On acceptance**: becomes `decisions/13-relationship-narratives-and-role-notes.md`; the cards in section 9 link to it.

---

## 1. Executive Summary

In Domain-Driven Design (DDD) strategic design, context maps and relationship tables express architectural boundaries with specialized acronyms and stereotypes: **OHS** (Open Host Service), **ACL** (Anti-Corruption Layer), **PL** (Published Language), **CF** (Conformist), **C/S** (Customer/Supplier), and **SK** (Shared Kernel).

These symbols are concise for experienced domain architects but carry a high cognitive load for developers, product managers, and cross-team stakeholders reading ODS diagrams and bounded context pages.

This RFC proposes:

0. **Render what the model already says**: the relationship `description` exists in the schema and in every reference model, and no surface shows it. Fix that first.
1. **Natural language sentence generation**: synthesize a human-readable sentence explaining each relationship from the perspective of the bounded context being viewed. One pure function in core, so the extension, the static export, the docsify site, and the AI skill all say the same thing.
2. **First-class role notes**: roles become objects so an author can record the concrete nature and rationale of each role instance (why this ACL exists, what it translates).
3. **A pattern knowledge base in core**: the theoretical nature and trade-offs of each pattern, shared by the pages legend, the doc generator, and the skill.
4. **Interactive popovers**: in the pages UI, generated sentences carry clickable terms, and diagram ports carry the same popover, showing the pattern's nature alongside the author's notes.

---

## 2. Motivation & Problem Statement

### 2.1 The Current Experience

When a user inspects a Bounded Context such as **Catalog BC**, the "Strategic position" section shows a table and a context map:

| Relationship | With | Type | Upstream role | Downstream role |
| :--- | :--- | :--- | :--- | :--- |
| `upstream of` | `Sales BC` | `customer-supplier` | `open-host-service` | `anti-corruption-layer` |
| `with` | `Inventory BC` | `shared-kernel` | *(empty)* | *(empty)* |

The context map renders edges with abbreviated port badges: `OHS`, `ACL`, `C/S`, `SK`.

### 2.2 Shortcomings

1. **The existing rationale is hidden.** `DirectedContextRelationshipSchema` and `SymmetricContextRelationshipSchema` both carry `description?: string`, and the petstore reference fills it ("Sales needs pet availability; Catalog commits to the summary contract"). The table in `packages/pages/src/lib/templates/ContextPage.svelte` has no column for it and the doc generator's context page does not print it. Half of the "missing why" is a rendering gap, not a modelling gap.
2. **Cryptic symbols.** Non-architect readers must translate `upstream of + customer-supplier + OHS + ACL` into practical consequences themselves.
3. **No per-role rationale.** The relationship description explains the relationship as a whole. There is nowhere to say *why this ACL* or *what this OHS commits to*.
4. **Disconnected diagram elements.** Port badges on context edges, and lollipops and sockets on consumable maps, give no inline explanation when explored interactively.

---

## 3. Data Model & Schema Enhancements

### 3.1 Roles become objects

Today `upstreamRoles` and `downstreamRoles` are arrays of plain strings. They become arrays of role objects. There is no string form and no migration: the project makes schema changes without backwards compatibility (memory `no-backwards-compatibility`). The four reference models, the skill reference docs, and the generated JSON schema are updated in the same change, which is a `feat!:` commit and cuts the next minor.

#### Schema Definitions (`packages/core/src/schema.ts`)

```typescript
export type UpstreamRole = "open-host-service" | "published-language";
export type DownstreamRole = "conformist" | "anti-corruption-layer";

/**
 * @title UpstreamRoleEntry
 * @description One upstream role on a directed relationship, with the author's rationale.
 */
export interface UpstreamRoleEntry {
	role: UpstreamRole;
	/** Why this role exists here and what it commits the upstream context to. */
	notes?: string;
}

/**
 * @title DownstreamRoleEntry
 * @description One downstream role on a directed relationship, with the author's rationale.
 */
export interface DownstreamRoleEntry {
	role: DownstreamRole;
	/** Why this role exists here and what it protects or adopts. */
	notes?: string;
}

export interface DirectedContextRelationshipSchema {
	type: DirectedRelationshipType;
	upstream: { $ref: string };
	downstream: { $ref: string };
	upstreamRoles: UpstreamRoleEntry[];
	downstreamRoles: DownstreamRoleEntry[];
	/** The relationship as a whole: why these two contexts integrate this way. */
	description?: string;
}
```

`SymmetricContextRelationshipSchema` is unchanged; its `description` is the only note it carries.

#### DSL (`packages/core/src/workspace.ts`)

`upstreamOf` and `downstreamOf` accept role entries. A bare role string is still accepted by the DSL as sugar for `{ role }`, normalised at the DSL boundary so the schema and the `Workspace` model only ever hold objects:

```typescript
salesBC.downstreamOf(catalogBC, {
	type: "customer-supplier",
	upstreamRoles: [
		{
			role: "open-host-service",
			notes: "Catalog exposes stable REST endpoints with semver guarantees.",
		},
	],
	downstreamRoles: [
		{
			role: "anti-corruption-layer",
			notes: "Sales maps external Pet DTOs to internal OrderPet value objects to isolate order history from catalog edits.",
		},
	],
	description: "Sales needs pet availability; Catalog commits to the summary contract.",
});
```

### 3.2 One source per note

Consumables and consumptions already carry `pattern?: UpstreamRole | DownstreamRole` and a required `description` (decision 09). This RFC does not add notes there. Each surface reads exactly one source:

| Surface | Reads |
| :--- | :--- |
| Strategic position sentence and its terms | relationship `description`, role entry `notes` |
| Context map port badge (`OHS`, `ACL`, `C/S`, `SK`, ...) | the same relationship's role entry `notes` |
| Consumable map lollipop (provided) | that consumable's `description` and `pattern` |
| Consumable map socket (consumed) | that consumption's `description` and `pattern` |

The pattern's theoretical nature (section 4) is shown on every surface; the author text differs by what the element is.

---

## 4. Pattern Knowledge Base (in core)

The knowledge base lives in core, at `packages/core/src/patterns.ts`, exported from the package index. Three consumers exist today and must agree: the pages legend (`packages/pages/src/lib/flow/legend.ts` maps marks to labels), the doc generator's context page, and the skill package's reference. Each replaces its own copy with a lookup into core.

```typescript
export interface PatternNature {
	name: string;
	abbreviation: string;
	category: "relationship" | "upstream-role" | "downstream-role";
	summary: string;
	architecturalNature: string;
	tradeOffs: string[];
}

export const PATTERNS: Record<ContextRelationshipType | UpstreamRole | DownstreamRole, PatternNature> = {
	"open-host-service": {
		name: "Open Host Service",
		abbreviation: "OHS",
		category: "upstream-role",
		summary: "A public, stable protocol or API provided by an upstream context.",
		architecturalNature:
			"The upstream context commits to maintaining a standardized, backward-compatible interface so multiple downstream subsystems can integrate without bespoke integration logic.",
		tradeOffs: [
			"Reduces coupling across multiple consumers",
			"Increases upstream maintenance overhead and versioning obligations",
		],
	},
	"anti-corruption-layer": {
		name: "Anti-Corruption Layer",
		abbreviation: "ACL",
		category: "downstream-role",
		summary: "A translating boundary isolating a downstream model from external concepts.",
		architecturalNature:
			"A translating mechanism (adapters, facades, mappers) that keeps foreign domain concepts, schema changes, or vendor anomalies from leaking into the downstream model.",
		tradeOffs: [
			"Maximum isolation and autonomy for the downstream context",
			"Cost of maintaining translation logic and data mappings",
		],
	},
	conformist: {
		name: "Conformist",
		abbreviation: "CF",
		category: "downstream-role",
		summary: "Downstream adopts the upstream domain model without translation.",
		architecturalNature:
			"The downstream team accepts the upstream model as-is, dropping translation layers when the upstream model fits well or translation overhead is unjustified.",
		tradeOffs: [
			"No translation and a simpler codebase",
			"Exposed to breaking upstream schema changes",
		],
	},
	"published-language": {
		name: "Published Language",
		abbreviation: "PL",
		category: "upstream-role",
		summary: "A well-documented shared interchange format.",
		architecturalNature:
			"An explicit schema standard (JSON Schema, Protobuf, an industry XML) that expresses domain operations and events independently of either context's internal representation.",
		tradeOffs: [
			"Enables polyglot integrations and widespread consumption",
			"Requires governance over schema evolution",
		],
	},
	"upstream-downstream": {
		name: "Upstream/Downstream",
		abbreviation: "U/D",
		category: "relationship",
		summary: "One context depends on another; the upstream does not plan around the downstream.",
		architecturalNature:
			"A directed dependency with no customer commitment: the upstream evolves on its own schedule and the downstream adapts through its roles.",
		tradeOffs: [
			"Upstream keeps full autonomy",
			"Downstream carries the integration risk",
		],
	},
	"customer-supplier": {
		name: "Customer/Supplier",
		abbreviation: "C/S",
		category: "relationship",
		summary: "Upstream plans for and prioritizes downstream requirements.",
		architecturalNature:
			"An asymmetric relationship where downstream needs act as customer requirements and upstream delivery commitments factor in downstream deadlines.",
		tradeOffs: [
			"Predictable alignment between collaborating teams",
			"Upstream velocity can be constrained by downstream dependencies",
		],
	},
	"shared-kernel": {
		name: "Shared Kernel",
		abbreviation: "SK",
		category: "relationship",
		summary: "A shared subset of domain model and code, co-owned by both teams.",
		architecturalNature:
			"A strictly bounded shared library, schema, or database subset. Neither team alters the kernel without joint consultation and continuous test verification.",
		tradeOffs: [
			"Prevents duplicate modeling and translation costs",
			"High coordination friction; degrades autonomy if it grows beyond a small subset",
		],
	},
	partnership: {
		name: "Partnership",
		abbreviation: "P",
		category: "relationship",
		summary: "Mutual co-operation where teams coordinate development and releases.",
		architecturalNature:
			"Two contexts succeed or fail together. Features spanning both are planned, co-designed, and released in synchronized cycles.",
		tradeOffs: [
			"Tight strategic cohesion across organizational boundaries",
			"Requires close communication and joint release cadences",
		],
	},
	"separate-ways": {
		name: "Separate Ways",
		abbreviation: "SW",
		category: "relationship",
		summary: "A deliberate decision to forego integration and develop independently.",
		architecturalNature:
			"Both contexts solve their requirements without technical links, accepting possible domain overlap to keep complete operational independence.",
		tradeOffs: [
			"Maximum operational autonomy with no cross-team dependencies",
			"Possible duplication of data and business logic",
		],
	},
};
```

`legend.ts` and `legend.test.ts` in pages become thin views over `PATTERNS` (mark to `name`), which is the test that the abbreviations agree everywhere.

---

## 5. Narrative Generation (in core)

`relationshipNarrative(relationship, viewpoint)` is a pure function in `packages/core/src/narrative.ts`. It returns structured segments, not a string, so pages can render terms as interactive tokens and the doc generator can render the same segments as markdown:

```typescript
export type NarrativeSegment =
	| { kind: "text"; text: string }
	| { kind: "context"; ref: string; name: string }
	| { kind: "pattern"; pattern: keyof typeof PATTERNS; notes?: string };

export type Narrative = {
	segments: NarrativeSegment[];
	/** The relationship's own description, rendered as a trailing aside. */
	description?: string;
};
```

### 5.1 Perspectives

A relationship is described from the perspective of the bounded context being viewed, `viewpoint`. Slots are named by role, never by graph position: `{Viewpoint}`, `{Upstream}`, `{Downstream}`, `{Other}`.

```
                  ┌────────────────────────┐
                  │ Context Relationship   │
                  └───────────┬────────────┘
                              │
             ┌────────────────┴────────────────┐
             ▼                                 ▼
   [Directed Relationship]            [Symmetric Relationship]
     ├── viewpoint is Upstream             ├── Shared Kernel (SK)
     └── viewpoint is Downstream           ├── Partnership (P)
                                           └── Separate Ways (SW)
```

### 5.2 Template Rules

Role clauses are built from the role arrays, in schema order, and joined with "and". Every rule has a clause for the empty array; both roles on one side is legal and covered.

**Upstream role phrase** (`upstreamRoles`, in the "exposing" position):

- none: *(clause omitted)*
- OHS: `an Open Host Service`
- PL: `a Published Language`
- OHS and PL: `an Open Host Service and a Published Language`

**Downstream role phrase** (`downstreamRoles`, subject is `{Downstream}`):

- none: `{Downstream} takes the upstream model as it comes`
- ACL: `{Downstream} protects its model with an Anti-Corruption Layer`
- CF: `{Downstream} conforms directly to the upstream model`
- ACL and CF: `{Downstream} conforms to the upstream model and protects the rest with an Anti-Corruption Layer`

#### Rule 1: Directed, viewpoint is Upstream

`{Viewpoint} {verb} {Downstream}[, exposing {upstream role phrase}], while {downstream role phrase}.`

- `customer-supplier`: verb is `acts as an upstream supplier to`
- `upstream-downstream`: verb is `is upstream of`

#### Rule 2: Directed, viewpoint is Downstream

`{Viewpoint} depends on {Upstream}[ as a customer][, consuming its {upstream role phrase}], and {downstream role phrase with subject "it"}.`

- `customer-supplier` adds ` as a customer`
- Downstream role phrase with subject "it": `it protects its model with an Anti-Corruption Layer` / `it conforms directly to the upstream model` / `it takes the upstream model as it comes`

#### Rule 3: Symmetric

- `shared-kernel`: `{Viewpoint} shares a Shared Kernel with {Other}; changes to it need both teams' agreement.`
- `partnership`: `{Viewpoint} is in a Partnership with {Other}; the two plan, build and release together.`
- `separate-ways`: `{Viewpoint} has gone Separate Ways from {Other}; there is no technical integration between them.`

#### Rule 4: Description

When the relationship has a `description`, it is returned in `Narrative.description` and every renderer shows it as a trailing aside after the sentence. This is part of the rule, not a courtesy of the renderer.

#### Rule 5: Implied relationships

Decision 03 derives the context map from explicit relationships first and falls back to links implied by consumptions. An implied link renders with the `upstream-downstream` template, no roles, and the trailing aside `Implied by consumptions; no explicit relationship is declared.` This reuses the wording the context page already uses for its empty state.

Every pattern name in a sentence is a `pattern` segment; every context name is a `context` segment. The words are fixed by these rules, so the doc generator and the pages renderer cannot drift.

---

## 6. Concrete Walkthrough (Petstore Reference)

### 6.1 Viewing `Catalog BC`

> **Catalog BC** acts as an upstream supplier to **Sales BC**, exposing an **Open Host Service**, while **Sales BC** protects its model with an **Anti-Corruption Layer**.
> *Sales needs pet availability; Catalog commits to the summary contract.*
>
> **Catalog BC** shares a **Shared Kernel** with **Inventory BC**; changes to it need both teams' agreement.
> *PetStatus and its values are one shared definition.*

### 6.2 Viewing `Sales BC`

> **Sales BC** depends on **Catalog BC** as a customer, consuming its **Open Host Service**, and it protects its model with an **Anti-Corruption Layer**.
> *Sales needs pet availability; Catalog commits to the summary contract.*
>
> **Sales BC** is upstream of **Inventory BC**, exposing a **Published Language**, while **Inventory BC** conforms directly to the upstream model.
>
> **Sales BC** is in a **Partnership** with **Fulfilment BC**; the two plan, build and release together.
>
> **Sales BC** has gone **Separate Ways** from **Identity BC**; there is no technical integration between them.

---

## 7. Interactive UI & Popover Specification

### 7.1 Interactive Sentences (`packages/pages`)

The context page renders `Narrative.segments` under "Strategic position", above the existing table. `context` segments render as the existing ref pill; `pattern` segments render as an `InteractiveTerm`:

```svelte
<!-- Conceptual: one component per segment kind, driven by the core function -->
<p class="narrative">
	{#each narrative.segments as s}
		{#if s.kind === "text"}{s.text}
		{:else if s.kind === "context"}<RefPill ref={s.ref} name={s.name} />
		{:else}<InteractiveTerm pattern={s.pattern} notes={s.notes} />{/if}
	{/each}
	{#if narrative.description}<span class="aside">{narrative.description}</span>{/if}
</p>
```

The Strategic position table gains a **Description** column in phase 0, independent of the rest.

### 7.2 Popover Card

Clicking an `InteractiveTerm`, a context-map port badge, or a consumable-map lollipop or socket opens one anchored popover:

```
┌─────────────────────────────────────────────────────────────┐
│  Anti-Corruption Layer                              [ACL]   │
│  Downstream role                                            │
├─────────────────────────────────────────────────────────────┤
│  NATURE                                                     │
│  A translating boundary that isolates a downstream model    │
│  from foreign concepts, so upstream schema changes do not   │
│  corrupt the internal ubiquitous language.                  │
│  + Maximum isolation and autonomy for the downstream context│
│  - Cost of maintaining translation logic and data mappings  │
├─────────────────────────────────────────────────────────────┤
│  NOTES                                                      │
│  Sales maps external Pet DTOs to internal OrderPet value    │
│  objects to isolate order history from catalog edits.       │
└─────────────────────────────────────────────────────────────┘
```

The NOTES section is omitted when the element carries no author text.

### 7.3 Mechanics

- **Trigger is click, not hover.** Hover does not exist on touch and is unreliable in a VS Code webview. Hover may add a highlight on the edge, never open the popover. Escape closes; clicking outside closes; opening one closes any other.
- **State lives in `packages/pages/src/lib/flow/popover.svelte.ts`** with its own unit tests, following the fullscreen module from extension card 14, so the 100% branch threshold holds without logic in templates.
- **Anchored inside the diagram.** Inside a diagram the popover renders within the `.interactive` element so it survives the fullscreen overlay's stacking context and is clipped by the canvas, not the page. On the context page it renders beside the term.
- **One popover component**, `PatternPopover`, fed `{ pattern, notes? }`; the three triggers only differ in where they get `notes` (section 3.2).
- **No drawer.** One popover with a max width of 360px serves the webview side panel, the static export, and the browser viewer alike.

### 7.4 Diagram Integration

- **Context-map port badges** in `PortBadge.svelte`: click opens the popover for that role with the relationship's role notes; the edge highlights while it is open.
- **Consumable-map lollipops and sockets** in `ConsumableNode.svelte`: click opens the popover for the consumable's or consumption's `pattern` with its `description` as the notes. Elements without a `pattern` show no popover.

---

## 8. Other Surfaces

- **Doc generator (`packages/doc`)**: the bounded context page renders the same narrative as markdown (bold for contexts and patterns, an italic aside for the description) and a **Description** column in its relationship table. Card 36's site test covers the anchors it links to.
- **Skill (`packages/skill`)**: the reference on strategic relationships is generated from `PATTERNS` so an agent explains a role in the same words the UI does, and the interview prompts ask for `notes` when a role is declared.

---

## 9. Rollout Plan & Cards

Five cards, in order. The first three are Opus-sized; the last two Sonnet-sized once the first three have landed.

| # | Card | Package(s) | Size |
| :--- | :--- | :--- | :--- |
| 0 | Render the relationship `description` on the context page (table column) and in the doc generator | pages, doc | Sonnet |
| 1 | Roles become `{ role, notes? }` objects: schema, DSL sugar, `Workspace` model, JSON schema regeneration, four reference models, skill reference. `feat!:` | core, models, skill | Opus |
| 2 | `PATTERNS` and `relationshipNarrative` in core with full permutation tests; pages legend, doc generator and skill consume them; docsify context page prints the narrative | core, pages, doc, skill | Opus |
| 3 | `InteractiveTerm`, `PatternPopover`, `popover.svelte.ts`; narrative rendered on the context page | pages | Sonnet |
| 4 | Popover on port badges and on lollipops and sockets; edge highlight | pages | Sonnet |

Card 1 and card 2 can run in parallel in separate worktrees; card 2 stubs the role entry shape until card 1 lands. Cards 3 and 4 wait for card 2.

---

## 10. Decisions Taken in Review

These were open questions in revision 1.

1. **Small viewports**: no docked drawer. A single popover with a max width, click-triggered, is enough for the webview side panel.
2. **Implied relationships**: yes, they get a narrative, with the trailing aside in Rule 5 reusing the page's existing wording.
3. **Glossary auto-linking from notes**: wanted, but out of scope here. It touches the glossary model and gets its own RFC.
4. **Backwards compatibility**: none. Roles are objects only; the string form survives as DSL sugar and nowhere else.
5. **Where the knowledge lives**: core, so the extension, the static export, the docsify site and the skill are one voice.
