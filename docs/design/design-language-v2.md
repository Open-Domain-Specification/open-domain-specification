# Design language v2

The pages are read in three places: an editor tab in VS Code, a static site,
and a browser. Three people read them. An architect scans a whole workspace
for boundaries and patterns. A developer opens one aggregate or context to see
what it owns, what it provides and what it consumes. A product person reads
the descriptions, the comments and the health of the model. All three are
scanning structured information, and all three are used to the surfaces VS
Code gives them for exactly that: the Outline, the Problems panel, the
Extensions detail page, the Settings editor, a hover over a symbol.

v1 grew as a port of a Mantine-style web app. It uses a pill for nearly every
word, a card around nearly every fact, and colour as decoration. v2 is the
language the pages will follow instead. It is written so a designer at
Microsoft would recognise every decision as one of the platform's own: theme
tokens for every colour, the editor's font at the editor's size, codicons for
kinds, native-feeling lists and tables, links that look like VS Code links,
restraint with colour, and a badge only where a native surface would use one.

The v2 primitives live under `packages/pages/src/lib/atoms/` with stories
under `Atoms/` in Storybook. Card 36 finished the migration: every page ships
from this language and nothing of v1 is left. The specs the implementation
cards worked from are in
[`v2-specs/`](v2-specs/).

## 1. Principles

1. **Every screen is a list.** The reader is scanning, so the page is an
   index: rows at the platform's 22px line, columns aligned, one name per row
   with its facts beside it. A card that boxes one fact becomes a row; a grid
   of cards becomes a table. Prose is limited to descriptions and leads.
2. **Hierarchy by type and space, not boxes.** Three heading levels, one body
   size, one secondary colour. What is inside what is said by size at the top
   level and by weight and the space above at the next two. There are no
   rules under headings, no capitals, no letterspacing, no rounded frames.
3. **Colour only where the platform colours.** Links take the link colour.
   Kind icons take the `symbolIcon` colours the Outline uses. Diagnostics
   take the error and warning colours the Problems panel uses. Nothing else
   is coloured: not a classification, not an identifier, not a root entity,
   not a success line.
4. **A word, not a pill.** A classifier (`event`, `internal`, `core`, `OHS`)
   is text in the secondary colour beside the name it classifies, the way a
   tree row carries its description. Codes from a table (`OHS`, `ACL`, a
   schema type) are set in the editor font so they read as tokens.
5. **Codicons for kinds, once per row.** The kind is said by its glyph in the
   lockup and never repeated as a word in the same row.
6. **Native lists, tables and links.** Rows hover with `list.hoverBackground`;
   in high contrast they hover with the dashed `contrastActiveBorder` outline.
   Table headers are secondary text in sentence case with one hairline under
   them. Links have no underline until hover and a `focusBorder` ring.
7. **A badge only where a native surface would use one.** The one badge in
   v2 is the count in a heading, which is the pane header's item badge. As on
   the platform it is never drawn at zero: the badge means "there are N", its
   absence means none.
8. **Disclosure in the editor's hover.** A pattern's meaning and an intent's
   evidence summary appear in the editor hover widget's frame (RFC-002
   section 4), never in a custom popover.
9. **Empty states say what would fill them.** One sentence in the secondary
   colour, and at most one action after it. A section or subsection never
   disappears because it is empty: the table of contents anchors it and the
   shape of the model is the information, so a context with no services says
   so under a Services heading, as an empty pane in VS Code keeps its title
   over "No symbols found".

## 2. What the VS Code UX guidelines require of a webview

From [the overview](https://code.visualstudio.com/api/ux-guidelines/overview)
and [the webview page](https://code.visualstudio.com/api/ux-guidelines/webviews),
the parts that bind a page rendered in an editor tab:

- Every element must be themeable through the colour tokens; the page must
  look right in light, dark and both high contrast themes. v2 pins nothing
  that is not a `--vscode-*` variable and gives every variable a fallback for
  the static site and the browser.
- Follow the accessibility guidance: colour contrast, ARIA labels, keyboard
  navigation. Sortable headers are buttons with `aria-sort`; a hover card has
  `role="tooltip"`; every link is focusable with a visible ring.
- Use command actions in the toolbar and in the view rather than inventing
  chrome. The page's only chrome is the existing toolbar.
- Do not repeat existing functionality and do not use a webview for what a
  native view can do. Navigation stays in the tree view; the page is content.

VS Code also gives the webview body one of `vscode-light`, `vscode-dark`,
`vscode-high-contrast` or `vscode-high-contrast-light`. v2 uses these only
where the platform itself draws differently by theme kind (the high contrast
hover outline). The theme harness in Storybook sets the same class.

## 3. Type scale

All sizes are relative to `--vscode-font-size` (13px in the editor and in the
static site) in `--vscode-font-family`. Identifiers, attribute names, types
and pattern abbreviations are set in `--vscode-editor-font-family`.

| Role                          | Size    | Weight | Line height | Colour                  |
| ----------------------------- | ------- | ------ | ----------- | ----------------------- |
| Page title (h1)               | 1.5em   | 600    | 1.3         | foreground              |
| Section (h2)                  | 1.15em  | 600    | 1.4         | foreground              |
| Subsection (h3)               | 1em     | 600    | 22px        | foreground              |
| Body, rows, cells             | 1em     | 400    | 22px rows, 1.5 prose | foreground     |
| Secondary: keywords, leads, terms, table headers, empty states | 1em | 400 | inherits | descriptionForeground |
| Code: ids, types, abbreviations | 0.92em | 400   | inherits    | inherits, editor font   |
| Count badge                   | 11px    | 400    | 18px        | badge tokens            |

Two sizes may share a row (a name and its id); never three. Prose paragraphs
are capped at 80 characters (`max-width: 80ch`).

Sizes in this table are absolute, not cumulative. The title lockup carries
1.5em so it reads as a title on its own, and the h1 it usually sits in carries
1.5em too; inside that h1 the lockup takes the heading's size rather than
multiplying it. A page title is 1.5em, never 2.25em.

## 4. Spacing scale

VS Code's rhythm is a 22px row. Everything else is a multiple of 4px.

| Token | Use                                                       |
| ----- | --------------------------------------------------------- |
| 2px   | Row gap in a definition list, comment rows                |
| 4px   | Icon to label, under a title                              |
| 8px   | Cell padding, gap between a name and its keyword, under a lead |
| 16px  | Above an h3, definition list column gap, page gutter      |
| 32px  | Above an h2                                               |
| 40px  | Scroll margin under the sticky toolbar                    |

There is no card padding and no grid gap, because there are no cards.

## 5. Colour: the token map

| v2 role                | Token                                                          | Fallback                          |
| ---------------------- | -------------------------------------------------------------- | --------------------------------- |
| Page background        | `--vscode-editor-background`                                   | site.css                          |
| Text                   | `--vscode-foreground`                                          | site.css                          |
| Secondary text         | `--vscode-descriptionForeground`                               | site.css                          |
| Link                   | `--vscode-textLink-foreground`                                 | site.css                          |
| Link hover             | `--vscode-textLink-activeForeground`                           | `--vscode-textLink-foreground`    |
| Focus ring             | `--vscode-focusBorder`                                         | site.css                          |
| Hairline               | `--vscode-panel-border`                                        | `rgba(128,128,128,.35)`           |
| Row hover              | `--vscode-list-hoverBackground`                                | none                              |
| High contrast hover    | `--vscode-contrastActiveBorder` (dashed outline)               | transparent                       |
| Kind icon              | `--vscode-symbolIcon-{class,method,function,field,event,...}Foreground` | `--vscode-icon-foreground` |
| Plain icon             | `--vscode-icon-foreground`                                     | site.css                          |
| Warning (refactor, big ball of mud) | `--vscode-editorWarning-foreground`               | site.css                          |
| Error (no root)        | `--vscode-editorError-foreground`                              | site.css                          |
| Count badge            | `--vscode-badge-background`, `--vscode-badge-foreground`       | site.css                          |
| Hover card             | `--vscode-editorHoverWidget-{background,border,foreground}`    | `editorWidget`, `widget-border`   |
| Hover card shadow      | `--vscode-widget-shadow`                                       | `rgba(0,0,0,.16)`                 |

Dropped from v1: `--core`, `--supporting`, `--generic` (the chart colours for
classification), `--card`, `--radius`, `--gap`. The chart colours remain in
the diagrams, where a cluster fill needs a hue; that is the diagram language's
concern, not the page's.

`assets/site.css` must gain the new tokens for the static site and the
browser: `textLink-activeForeground`, `focusBorder`, `list-hoverBackground`,
`contrastActiveBorder`, `editorInfo-foreground`, `editorHoverWidget-*`,
`widget-shadow`, `textCodeBlock-background` and the five `symbolIcon-*`
tokens, in light and dark. The values are the ones in
`packages/pages/src/lib/Theme.harness.svelte`.

## 6. Icons: kinds, codicons, symbol colours

Kinds keep the codicons in `packages/pages/src/lib/icons.ts`. Where the
codicon is a symbol icon the Outline colours, the kind takes the same token
(`packages/pages/src/lib/atoms/kinds.ts`); where it is not, the kind stays in
`icon.foreground`, as the platform does.

| Kind            | Codicon            | Colour token                       |
| --------------- | ------------------ | ---------------------------------- |
| workspace       | `package`          | `symbolIcon.packageForeground` (= foreground) |
| domain          | `symbol-namespace` | `symbolIcon.namespaceForeground` (= foreground) |
| subdomain       | `symbol-module`    | `symbolIcon.moduleForeground` (= foreground) |
| boundedcontext  | `symbol-class`     | `symbolIcon.classForeground` (orange) |
| aggregate       | `symbol-structure` | `symbolIcon.structForeground` (= foreground) |
| service         | `symbol-method`    | `symbolIcon.methodForeground` (purple) |
| entity          | `symbol-field`     | `symbolIcon.fieldForeground` (blue) |
| valueobject     | `symbol-constant`  | `symbolIcon.constantForeground` (= foreground) |
| event           | `broadcast`        | `symbolIcon.eventForeground` (blue) |
| command         | `zap`              | `symbolIcon.functionForeground` (purple) |
| invariant, policy, term, team, schema, consumption, relationship | as today | `icon.foreground` |

So four kinds carry a hue on a page: contexts, services, entities and
consumables. They are the four kinds a reader looks for first, and they are
the hues the same reader already knows from the Outline of any TypeScript
file.

## 7. The v2 primitives

Each primitive is one file under `packages/pages/src/lib/atoms/`, with a
`*.harness.svelte` showcase that the `Atoms/...` stories render in light, dark and
high contrast (and at density where rows are laid out), and a `*.test.ts` at
100% coverage.

| Primitive         | Replaces in v1                                    | What it is                                                                                         |
| ----------------- | ------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `Keyword`         | `Chip`, `ConsumableChips`, `Dim`                   | A classifying word in the secondary colour; `mono` for codes; `warn`/`error` tone only for a diagnostic meaning; a `title` is its hover text. |
| `Lockup`          | `RefLink` + `IdChip` + the crumb kind eyebrow      | Kind icon in its symbol colour, name (a `Ref` when it has one), then id and detail in the secondary colour. `size="title"` for the h1. |
| `Ref`             | `RefLink`                                          | The link. `external` adds `rel` and the trailing `link-external` codicon.                          |
| `DefinitionList`, `Definition` | `Fact`, `.facts`, single-fact `Card`s    | Term beside value in an aligned grid at 22px rows.                                                  |
| `DataTable`       | `table`, `Grid` of `Card`s, `ProvidesTable`, `ConsumesTable`, `AttributeTable`, `StrategicPositionTable`'s table | Native-looking rows with hover, sentence-case secondary header, optional groups and sortable columns; cells are the caller's snippet. One column `grow`s — it takes the width the others do not need and is the only one that wraps; the last column grows when none is named, so a table whose prose is not its last column must name it. |
| `Heading`         | `h1`, `h2`, `h3`, `Section` header, `.toc-title`   | The three levels; `lead` under a level 2; `count` draws the pane badge.                            |
| `Comments`        | `CommentList`                                      | Comment codicon in a gutter, statement, citation as an external `Ref` with a kind icon.            |
| `Disposition`     | `DispositionChip`                                  | Problems-panel treatment: `warning` codicon in the warning colour for refactor, `info` in the secondary colour for tolerated, nothing for by design. |
| `EmptyState`      | `Empty`                                            | One secondary sentence at row height, optional action.                                             |
| `HoverCard`       | (new, RFC-002 section 4)                           | The editor hover widget's frame: a heading for the thing hovered, the body, `<hr>` between parts. First used by `molecules/PatternHover`, the pattern keyword's disclosure: the pattern's meaning above the rule, this relationship's disposition and comments below it. |

What v2 deliberately has no primitive for: card, grid, pill, chip, badge (the
count is a property of a heading), tag list.

## 8. Audit of v1

Every v1 story was screenshotted in light and dark at 1000px into
[`audit/`](audit/), named `<story-id>--<light|dark>.png` (156 files). Captured
with Playwright against the built Storybook with `colorScheme` emulation,
because `assets/site.css` switches on `prefers-color-scheme`. The problems,
with the screenshots that show them:

**Chips carry six meanings in one shape.** In the provides table
([`templates-contextpage--petstore--light.png`](audit/templates-contextpage--petstore--light.png))
the kind (`event`), visibility (`internal`), pattern (`published-language`) and
in the strategic position table
([`organisms-strategicpositiontable--eight-relationships-dark--dark.png`](audit/organisms-strategicpositiontable--eight-relationships-dark--dark.png))
the type, both roles and the disposition are all the same grey pill; the
counterpart context is a darker pill that is actually a link. Nothing stands
out, and clickable and non-clickable look the same. v2: `Keyword` for the
words, `Lockup` for the link, `Disposition` for the one thing that is a
diagnostic.

**Cards box single facts.** The Model section of a context page spends 110px
of height on one aggregate's name, description and counts inside a frame;
the invariants on an aggregate page are each a card holding one sentence and
one pill ([`templates-aggregatepage--petstore--dark.png`](audit/templates-aggregatepage--petstore--dark.png)).
The relationship detail is a card containing two more cards that hold nothing
but a name ([`organisms-relationshipdetail--refactor-light--light.png`](audit/organisms-relationshipdetail--refactor-light--light.png)).
v2: rows in a `DataTable`, or a level-3 `Heading` with a `DefinitionList`.

**Five competing uppercase label styles.** The crumb kind, the facts terms,
the h3, the table header and the TOC title are all small tracked capitals in
the secondary colour, so the eye cannot tell a section from a column from a
fact ([`templates-workspacepage--petstore--light.png`](audit/templates-workspacepage--petstore--light.png)).
v2 has no capitals: the kind is a detail after the title, facts are a
definition list, h3 is bold body text, table headers are sentence case.

**Colour spent on decoration.** Purple, blue and green for core, supporting
and generic; a bordered pill for the identifier; a purple glow on the root
entity's card; a green tick line for "no problems"
([`templates-workspacepage--petstore--light.png`](audit/templates-workspacepage--petstore--light.png),
[`templates-aggregatepage--petstore--dark.png`](audit/templates-aggregatepage--petstore--dark.png)).
None of it is a colour a VS Code surface would use for that meaning. v2
colours kind icons with the Outline's tokens and diagnostics with the Problems
panel's, and nothing else.

**Health report as a dashboard.** Three stat tiles in frames above the lists
([`organisms-healthreport--petstore-light--light.png`](audit/organisms-healthreport--petstore-light--light.png)).
v2: the counts are heading badges on the three sections, and each section is a
table.

**What v1 already does well.** Tables read cleanly and are the densest thing on
any page; the page toolbar and the diagrams are native enough; the descriptions
are good copy. v2 keeps the copy and makes the table the default container.

## 9. Verdict on every v1 component

Keep: use as is. Restyle: same component, built on v2 primitives. Replace:
a v2 primitive takes its place. Remove: no equivalent in v2. Story, test and
harness files follow their component.

### Atoms (`packages/pages/src/lib/atoms/`)

| File                     | Verdict  | Note                                                                 |
| ------------------------ | -------- | -------------------------------------------------------------------- |
| `Chip.svelte`            | replace  | `v2/Keyword`.                                                        |
| `Dim.svelte`             | remove   | Secondary colour is a property of `Keyword`, `Lockup` detail and `EmptyState`, not a wrapper. |
| `DispositionChip.svelte` | replace  | `v2/Disposition`.                                                    |
| `Empty.svelte`           | replace  | `v2/EmptyState`.                                                     |
| `Icon.svelte`            | keep     | Still the way to draw an ad hoc codicon outside a lockup.            |
| `IdChip.svelte`          | replace  | `Lockup`'s `id`.                                                     |
| `Logo.svelte`            | keep     | Site sidebar only.                                                   |
| `Markdown.svelte`        | keep     | Same parser; the page stylesheet caps `.md` at 80ch.                 |
| `RefLink.svelte`         | replace  | `v2/Ref`.                                                            |

### Molecules (`packages/pages/src/lib/molecules/`)

| File                       | Verdict  | Note                                                                           |
| -------------------------- | -------- | ------------------------------------------------------------------------------ |
| `AttributeTable.svelte`    | restyle  | A `DataTable`: key icon, attribute (editor font), type (`Ref` or editor font), description. |
| `Card.svelte`              | remove   | Rows and subsections replace it.                                               |
| `CommentList.svelte`       | replace  | `v2/Comments`.                                                                 |
| `ConsumableCard.svelte`    | replace  | A row in the provides `DataTable` on a context or service; a level-3 subsection on an aggregate. |
| `ConsumableChips.svelte`   | replace  | Three `Keyword`s in the row's cells.                                           |
| `ConsumesTable.svelte`     | restyle  | A `DataTable`.                                                                 |
| `ContextPill.svelte`       | replace  | `Lockup kind="boundedcontext"` and, for a big ball of mud, a `warn` `Keyword` after it. |
| `Fact.svelte`              | replace  | `v2/Definition`.                                                               |
| `Grid.svelte`              | remove   | Nothing is laid out in a grid of cards.                                        |
| `Problems.svelte`          | restyle  | The Problems panel: severity codicon in its colour, message, rule id as a `mono` `Keyword`, `Ref` to the element; no left rule, no frame. |
| `ProvidesTable.svelte`     | restyle  | A `DataTable`.                                                                 |
| `RefList.svelte`           | restyle  | Comma-separated `Ref`s; the empty word is a `Keyword`.                         |
| `StructureCard.svelte`     | replace  | A level-3 `Heading` (lockup, `aggregate root` keyword), description, attribute `DataTable`, relations list. |
| `SubdomainCard.svelte`     | replace  | A row: subdomain lockup, classification keyword, served-by lockups, description. |
| `TeamLine.svelte`          | replace  | `Lockup kind="team"` or the keyword `no owning team`.                          |

### Organisms (`packages/pages/src/lib/organisms/`)

| File                            | Verdict  | Note                                                                         |
| ------------------------------- | -------- | ---------------------------------------------------------------------------- |
| `AttributesSection.svelte`      | restyle  | `Heading` 2 with lead, attribute `DataTable`.                                |
| `DiagramFigure.svelte`          | restyle  | No rounded frame: the canvas between two hairlines, caption as secondary text. |
| `HealthReport.svelte`           | restyle  | Counts become heading badges; each section a grouped `DataTable` with `Comments` under each row. |
| `InteractiveDiagram.svelte`     | keep     | The diagram language has its own cards.                                      |
| `InvariantsSection.svelte`      | restyle  | Rows: invariant lockup, description.                                         |
| `LanguageSection.svelte`        | restyle  | Comma-separated term `Ref`s, no pills.                                       |
| `PageHeader.svelte`             | replace  | Crumbs as `Ref`s, `Heading` 1 with a title `Lockup` whose detail is the kind word, description, `DefinitionList` of facts. |
| `RelationshipDetail.svelte`     | restyle  | No outer card; heading, type keyword, disposition; roles as a definition list per side; comments; crossings table; links list. |
| `Section.svelte`                | restyle  | `Heading` 2 with lead and count, problems inline, then children.             |
| `Sidebar.svelte`                | restyle  | Active row uses `list.activeSelection*`; no uppercase brand title.           |
| `StrategicPositionTable.svelte` | restyle  | Grouped `DataTable`; keywords for type and roles; `Disposition`; the expanded row stays. |
| `Toc.svelte`                    | restyle  | Drop the uppercase title; otherwise the same left-rule list.                 |

### Templates (`packages/pages/src/lib/templates/`) and the layout

| File                       | Verdict  | Note                                                                          |
| -------------------------- | -------- | ----------------------------------------------------------------------------- |
| `AggregatePage.svelte`     | restyle  | Structure as subsections, invariants as rows, provides as subsections.         |
| `ConsumablePage.svelte`    | restyle  | Header facts as a definition list; raised/raises as ref lists; policies as rows. |
| `ContextPage.svelte`       | restyle  | Model as two tables; schemas as subsections; language as a table.             |
| `DomainPage.svelte`        | restyle  | Subdomains as a table.                                                        |
| `EntityPage.svelte`        | restyle  | Relations as two tables.                                                      |
| `InvariantPage.svelte`     | restyle  | Constrains as rows.                                                           |
| `PolicyPage.svelte`        | restyle  | When/then as tables.                                                          |
| `RelationshipPage.svelte`  | restyle  | Same block as the detail, at page level.                                      |
| `SchemaPage.svelte`        | restyle  | Carried-by as a table.                                                        |
| `ServicePage.svelte`       | restyle  | Provides and consumes as tables.                                              |
| `SubdomainPage.svelte`     | restyle  | Classification in the header; served-by as a table.                           |
| `TeamPage.svelte`          | restyle  | Owns and problem space as tables.                                             |
| `TermPage.svelte`          | restyle  | Aliases as keywords; elsewhere as a table.                                    |
| `ValueObjectPage.svelte`   | restyle  | Usage and relations as tables.                                                |
| `WorkspacePage.svelte`     | restyle  | Problem space as one table per domain; teams as a table; health as the Problems list. |
| `Page.svelte` (layout)     | keep     | Two columns with the TOC; the 1200px cap stays.                               |

Each entry has a short spec in [`v2-specs/`](v2-specs/).

## 10. Decisions I am least sure about

1. **Kind icons in the Outline's symbol colours.** It is the platform's own
   convention and it makes contexts, services, entities and consumables
   findable at a glance; but it puts four hues on a page whose principle is
   restraint. If it reads as noise on a dense table, the fallback is to keep
   the tokens only on the page title and drop them in rows.
2. **Classification loses its colour.** `core`, `supporting` and `generic`
   become plain keywords. An architect scanning a domain for its core
   subdomains loses the purple cue; the word in a sortable column is meant to
   replace it. If it is missed, the classification column can sort first.
3. **No hairline between rows.** A v2 table draws one rule under the header
   and relies on the 22px rhythm and the hover wash to separate rows, as the
   keybindings editor does. v1 ruled every row, and on a wide provides table
   with a wrapped description the rule did help the eye track across. If a
   dense table proves hard to read across, the fallback is a hairline in
   `panel.border` at 50% under each row.

A fourth was tried and dropped: a dotted help underline under a keyword that
has a meaning to reveal. The editor marks nothing hoverable, and under every
pattern code in a table it was noise. A keyword with a title keeps only the
help cursor.

## 11. Rulings from the morning review

The human approved the language on 2026-09-05 with the three decisions in
section 10 as designed. The review left six nits; the rulings, with their
reasons, are on card 34 and summarised here so the language says one thing.

- **The count badge is not drawn at zero** (principle 7). `Heading` draws
  the badge only for a count above zero. The Problems tab, the Source Control
  view and the Extensions view hide theirs at zero, and the empty sentence
  under the heading already says the zero in words; `0` beside "No policies."
  said it twice.
- **An empty section or subsection stays on the page** (principle 9). This
  covers the paired level-3 headings inside a section (Aggregates and
  Services, Provides and Consumes, Entities and Value objects, Outgoing and
  Incoming, Operations and Events): the pair is the fixed shape of the
  section, and seeing the shape is how a reader learns that a context has
  aggregates and no services rather than wondering whether the services live
  elsewhere. v1 hid the heading because an empty card grid was a hole; an
  empty row list is one heading and one secondary line.
- **The health page uses `PageHeader` with a plain title.** It is the one
  page that is a read of the workspace rather than an element. A lockup
  carries a kind, an id and a detail, and a report has none; a workspace
  lockup would claim the page is the workspace, which the crumb already names
  as where the reader came from. The title is the report's name behind the
  pulse codicon the tree draws on the health node, at the size a title
  lockup's icon takes, so the row the reader clicked and the title they land
  on match.
- **The workspace page has one health section, "Health".** v1's two sections
  ("Model health" for the rule checker, "Health" for the evidence) are one in
  v2 and the naming moves down a level: the section's first level-3 heading
  is "Structure", badged with the diagnostic count as the Problems panel is,
  and the report's Refactor, Tolerated and No comments follow it. The
  reader's question is one, "what is the model unhappy about", with four
  kinds of answer, and "Structure" names the source of the findings the way
  "Refactor" and "Tolerated" do. The section, the full page and the tree node
  share the name.
- **`V2Page.harness.svelte` keeps its name until v1 is deleted.** A rename
  edits the compare harness, which card 33 owns, and a re-export at the old
  name is an alias this repo does not keep. Once cards 35 and 36 remove v1 and
  the compare harness every `V2` prefix is stale, and the harnesses are
  renamed in that pass, `Strategic.harness.svelte` beside
  `Tactical.harness.svelte`.
- The compare story's collapsing v1 column is card 33's.

## 12. Reproducing the audit

```sh
cd packages/pages
node scripts/codicons.mjs            # preview.ts imports assets/codicons/codicon.css
npm run build-storybook
node e2e/static-server.mjs 4190 storybook-static &
```

Then screenshot `http://localhost:4190/iframe.html?viewMode=story&id=<id>` for
every story id in `storybook-static/index.json` with Playwright, once with
`colorScheme: "light"` and once with `"dark"`, `viewport 1000x700`,
`deviceScaleFactor 1`, `fullPage: true`. The `V2/` stories carry their theme in
the story itself and do not need the emulation.
