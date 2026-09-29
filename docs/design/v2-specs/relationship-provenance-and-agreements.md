# Relationship provenance and agreements

Two small presentation specs, one per issue. Both keep the design language v2
rules: secondary colour for a classifying word, `Keyword` not a pill, a `Ref`
for anything with a page, and nothing shown for the common case that means
"nothing to say".

## Spec 1 (issue #43): a generated description looks generated

### Where the fallback appears

| Surface | File | What happens today |
| --- | --- | --- |
| Pages, strategic position table | `packages/pages/src/lib/organisms/StrategicPositionTable.svelte:111` | `<span class="description">` holds `r.description` or `narrativeOf(r)`; identical look |
| Markdown, strategic position table | `packages/doc/src/strategic-position.md.ts:26-27` | `r.description ?? *sentence*`; italic only, no word says why |

No other surface uses the narrative as a description. The only other call is
`StrategicPositionTable.svelte:109`, where the sentence is the counterpart
lockup's `title` (hover text) in every case, authored or not; that is a hover,
not a description, and stays as it is. `RelationshipDetail.svelte` and
`RelationshipPage.svelte` do not fall back at all.

### Pages treatment

Authored: unchanged. `<span class="description">{r.description}</span>`.

Generated: the sentence in the secondary colour, followed by the keyword
`generated`.

```svelte
{:else if col.key === "description"}
  {#if r.description}
    <span class="description">{r.description}</span>
  {:else}
    <span class="description generated">{narrativeOf(r)} <Keyword text="generated" title={GENERATED_TITLE} /></span>
  {/if}
```

- Colour: `.description.generated { color: var(--vscode-descriptionForeground); }`
  in the component's `<style>`, beside the existing `.description` rule at
  `StrategicPositionTable.svelte:153-156`. It is the token the language
  already uses for a lead, a keyword, an empty state and a table header
  (`docs/design/design-language-v2.md`, section 3 and section 5, "Secondary
  text"). No italic, no icon, no border.
- Marker: `Keyword` (`packages/pages/src/lib/atoms/Keyword.svelte`), plain
  (not `mono`, no tone). Text, word for word: `generated`. It is visible text,
  so a screen reader reads "... generated" after the sentence; no extra ARIA
  is needed and none should be added.
- Hover: the `title` on the `Keyword`, word for word:
  `Generated from the relationship's type and roles. The model has no authored description.`
  Define it once as a constant `GENERATED_TITLE` in the component script.
- The keyword sits inside the `.description` span so it wraps with the
  sentence at the 34ch cap rather than holding a second line open.

Runner-up, rejected: italic sentence with no marker. Italic reads as emphasis
in a dense table and says nothing to a screen reader.

Before (RiverMart, Catalogue's page):

```
With     Description                                                     Type
Search   Catalogue is upstream of Search, exposing a Published           upstream-downstream
         Language, while Search conforms directly to the upstream model.
```

After:

```
With     Description                                                     Type
Search   Catalogue is upstream of Search, exposing a Published           upstream-downstream
         Language, while Search conforms directly to the upstream model.
         generated                              (whole cell in secondary colour)
```

### Markdown treatment

`packages/doc/src/strategic-position.md.ts:26-27`: keep the italics and add
the suffix ` (generated)`, outside the italics, in plain text. Word for word:

```ts
r.description ?? `*${narrativeText(relationshipNarrative(r, bc))}* (generated)`;
```

No pipe, no line break, no HTML, so `markdownTable` is untouched and GitHub
renders it inside the cell. Update the comment above it to say the suffix is
the marker and italics are the muted look.

Before:

```
| Search | *Catalogue is upstream of Search, exposing a Published Language, while Search conforms directly to the upstream model.* | upstream-downstream | published-language | conformist |
```

After:

```
| Search | *Catalogue is upstream of Search, exposing a Published Language, while Search conforms directly to the upstream model.* (generated) | upstream-downstream | published-language | conformist |
```

Runner-up: a leading `Generated:` label. Rejected because it pushes the
sentence's subject (the counterpart) off the start of the cell.

## Spec 2 (issue #55): the agreement an exchange runs under

`Consumption.relationship?: ContextRelationship`
(`packages/core/src/workspace.ts:2494`). A relationship has a page
(`packages/pages/src/lib/resolve.ts:16, 68`), so the agreement is always a
`Ref` on the pages. The label is the agreement's `name`; where a consumption
names a relationship that has no `name` (a pair with one agreement, named
anyway), the label is the relationship's `type`, so the cell never reads
blank while pointing somewhere.

### Consumes tables (pages)

One molecule, `packages/pages/src/lib/molecules/ConsumesTable.svelte`, serves
all four callers (`AggregatePage.svelte:127`, `ServicePage.svelte:56`,
`ContextPage.svelte:313`, `ConsumablePage.svelte:317`). Change it once.

- New column `{ key: "agreement", label: "Agreement" }`, placed after
  `Context` and before `Made By`: the agreement is a fact about the two
  contexts, so it sits beside the context cell, and the two consumer-side
  facts (`Made By`, `Protection`) stay together at the end.
- The column is present only when at least one row names a relationship, the
  same conditional the strategic position table uses for its toggle and
  disposition columns (`StrategicPositionTable.svelte:50-52, 76, 84`):
  `const withAgreement = $derived(consumptions.some((x) => x.relationship));`.
  When the pair holds one agreement nobody names it (decision 15, amended
  2026-09-10), so a table where no row names one has nothing to show and no
  column to show it in.
- Cell, where named:
  `<Ref ref={x.relationship.ref} label={x.relationship.name ?? x.relationship.type} icon={ICONS.relationship} title={AGREEMENT_TITLE} />`
  with `AGREEMENT_TITLE`, word for word:
  `The relationship this exchange runs under.`
- Cell, where not named but the column is present: empty. No dash, no
  keyword. Precedent: the `Visibility` column in `ProvidesTable.svelte:45-48`
  is empty when a consumable is not internal. Absence means "the pair's only
  agreement", which is the common case and not a gap.

Runner-up: fold the agreement into the `Context` cell as a `Lockup` detail.
Rejected: the lockup is one token and an agreement name of three words
would break the cell's wrap rule.

Before (RiverMart, WarehouseAPI's consumes table):

```
Consumable             Provider            Context                     Made by             Protection
PurchaseOrderReceived  PurchaseOrder       Vendor Purchasing (Legacy)  whole consumer      anti-corruption-layer
GetPurchaseOrder       Purchasing Gateway  Vendor Purchasing (Legacy)  BookVendorDelivery  anti-corruption-layer
```

After:

```
Consumable             Provider            Context                     Agreement                Made by             Protection
PurchaseOrderReceived  PurchaseOrder       Vendor Purchasing (Legacy)  ⇄ legacy stock feed      whole consumer      anti-corruption-layer
GetPurchaseOrder       Purchasing Gateway  Vendor Purchasing (Legacy)  ⇄ purchase order lookup  BookVendorDelivery  anti-corruption-layer
```

(`⇄` stands for `ICONS.relationship`; the name is a link to the relationship
page.)

### Consumable map edge (pages)

`packages/pages/src/lib/flow/ConsumableEdge.svelte` and
`packages/pages/src/lib/flow/consumable-graph.ts:114-127`.

- The midpoint label stays the consumable name. Two consumptions of one
  consumable by one consumer share a socket and a lollipop, so a second text
  label at the midpoint would overprint; the hover is the one place that stays
  legible when two agreements join the same pair.
- The `<title>` on the edge label (`ConsumableEdge.svelte:119`) gains a line.
  Compose it as `ContextEdge.svelte:65-67` does, lines joined with `\n`,
  `Made by` first, then the agreement:
  `Under the purchase order lookup agreement`
  Word for word: `Under the ${name} agreement`, where `name` is the
  relationship's name, or its type when unnamed. The `<title>` renders
  whenever either line exists, not only when `madeBy` does.
- Data: `consumable-graph.ts` passes `agreement: e.agreement?.name` on the
  edge, and `ConsumableEdge` reads it from `data`. This needs
  `ODSConsumptionMapEdge` (`packages/core/src/consumable-map.ts:146-156`) to
  carry `agreement?: { name?: string; type: string; ref: string }` from
  `consumption.relationship`; that is a core change and Lead's call. Without
  it the edge cannot know.

Runner-up: a second `<tspan>` line under the label with the agreement name at
the same 11px in `--vscode-descriptionForeground`. Keep it in reserve if the
hover proves too hidden; it needs a de-overlap rule the map does not have.

### Markdown (`packages/doc`)

Consumption section on an aggregate or service page,
`packages/doc/src/consumptions.md.ts:9-19`: a bullet after `Provider`, in the
shape `madeByMd` already uses, left out when the consumption names none.

```ts
export const agreementMd = (consumption: Consumption) =>
  consumption.relationship
    ? `\n- **Agreement**: ${consumption.relationship.name ?? consumption.relationship.type}`
    : "";
```

Plain text, not a link: `packages/doc` writes no relationship page
(`packages/doc/src/index.ts` and `lib/paths.ts` have no relationship path).

Before:

```
### GetPurchaseOrder [anti-corruption-layer]
Asked with a PO number, answers with the purchase order and its lines, so a delivery can be booked against it before the nightly file arrives
- **Provider**: [Purchasing Gateway](../../../vendor_purchasing_(legacy)/services/purchasing_gateway/index.md)
- **Made by**: BookVendorDelivery
```

After:

```
### GetPurchaseOrder [anti-corruption-layer]
Asked with a PO number, answers with the purchase order and its lines, so a delivery can be booked against it before the nightly file arrives
- **Provider**: [Purchasing Gateway](../../../vendor_purchasing_(legacy)/services/purchasing_gateway/index.md)
- **Made by**: BookVendorDelivery
- **Agreement**: purchase order lookup
```

Consumptions table on a context page,
`packages/doc/src/boundedcontext.md.ts:233-252`: a column `Agreement` after
`Consumed As`, cell `it.relationship?.name ?? it.relationship?.type ?? "-"`.
The dash is that table's own convention for an absent value (`Made By`,
`Consumed As`, `Provided As` all use it), and a Markdown table cannot drop a
column per row.

The map's Markdown form is the Graphviz SVG the page embeds
(`aggregate.md.ts:71`, `service.md.ts:14`). Recommendation, for Lead:
`packages/graphviz/src/consumable-map.ts:118` labels the edge
`edge.target.name`; the context map already stacks the agreement name under
the stereotype (`packages/graphviz/src/context-map.ts:114`), so the same
shape here is `label: agreement ? \`${edge.target.name}\n${agreement}\` :
edge.target.name`, plus `tooltip: \`Under the ${agreement} agreement\``.
That is the graphviz package, outside this spec's paths.

## Lead rulings (2026-09-29)

- The consumable map's edge data (`ODSConsumptionMapEdge` in `packages/core/src/consumable-map.ts`) carries the agreement as `agreement?: { name?: string; type: string; ref: string }`, taken from `consumption.relationship`. It is derived map data showing a fact the model already records, not a metamodel change.
- The Graphviz consumable map follows the recommendation above: the label is `${consumable}\n${agreement}` when the consumption names an agreement, with the tooltip `Under the ${agreement} agreement`. Generated Markdown embeds this SVG, so the agreement reaches Markdown's map too.
- The spec is indexed in `README.md` beside the diagram specs.
