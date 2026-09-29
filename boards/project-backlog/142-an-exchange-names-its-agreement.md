---
column: doing
labels: [pages, doc]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-29T15:10:00.000Z
---
# An exchange names its agreement

Issue #55, a child of epic #62. A consumption can name the relationship it runs under and the context map draws one line per named agreement, but no page or table said which agreement a given exchange belongs to, so a reader of two contexts holding two agreements had to infer it. The consumes tables on the aggregate, service, context and consumable pages now name the agreement where the consumption names one, the consumable map's edge carries it, and Markdown states it. The design is Spec 2 and the Lead rulings of `docs/design/v2-specs/relationship-provenance-and-agreements.md`. No metamodel change: the fact was already recorded on `Consumption.relationship`. The epic's acceptance is that a reader can identify the exact agreement for a consumption that names one without inferring it from the context pair, covered for more than one agreement between the same two contexts.

## Checklist

- [x] Failing tests first, on a fixture of two contexts holding two named agreements with a consumption under each and one that names none
- [x] Core: `ODSConsumptionMapEdge.agreement` from `consumption.relationship`
- [x] Pages: an "Agreement" column on `ConsumesTable`, shown only when a row names one, a `Ref` to the relationship page, empty where none
- [x] Pages: the consumable edge's hover gains "Under the {name} agreement" after "Made by"
- [x] Graphviz: the consumable map's edge label and tooltip
- [x] Doc: the `Agreement` bullet on a consumption and the `Agreement` column in a context's Consumptions table
- [x] A Playwright assertion on RiverMart's two agreements
- [x] Pages coverage stays at 100%; core, graphviz, doc and pages unit suites and `npm run check` green
- [x] Reference models' diagnostics unchanged; generated docs checked and not committed (see journal)

## Gates

- [ ] `npx @biomejs/biome check` on the touched files exits 0
- [ ] `bash scripts/verify-all.sh` green

## Comments

- **developer** (2026-09-29T15:10:00.000Z): Core `packages/core/src/consumable-map.ts:84-93` adds `agreement` to the edge only where the consumption names a relationship; the type is at `:170`. `ref` is `relationship.ref`, the same string the relationship page route matches (`packages/pages/src/lib/resolve.ts:68`). Two agreements between one pair give two distinct refs, and the edge id is an object hash, so an exchange under each stays its own edge.
- **developer** (2026-09-29T15:10:00.000Z): Pages `packages/pages/src/lib/molecules/ConsumesTable.svelte:33-40` derives the column list from `consumptions.some((x) => x.relationship)`, and `:59-67` renders the cell as a `Ref` labelled `name ?? type` with `ICONS.relationship` and the title "The relationship this exchange runs under."; a row naming none renders an empty cell. `flow/consumable-graph.ts:127` passes the resolved name (name, else type) as a plain string, through `flow-nodes.ts` and `graph.ts` into the edge's data, and `flow/ConsumableEdge.svelte:98-108` joins the hover lines with a newline. The midpoint label is unchanged. The spec said to pass `e.agreement?.name`; the resolved name is passed instead so an unnamed agreement, which the spec also wants the type for, needs no second field.
- **developer** (2026-09-29T15:10:00.000Z): Graphviz `packages/graphviz/src/consumable-map.ts:104-127` labels the edge `${consumable}\n${agreement}` with the tooltip `Under the ${agreement} agreement`, and adds the tooltip only where an agreement is named, so an unnamed exchange's DOT is byte-identical to before.
- **developer** (2026-09-29T15:10:00.000Z): Markdown `packages/doc/src/consumptions.md.ts:20-23` (`agreementMd`, after Provider and Made by) and `packages/doc/src/boundedcontext.md.ts:238` and its cell after `Consumed As`. Running the petstore and clinic builds would change nine tracked files under `models/petstore/docs` and `models/clinic/docs` (each context page's Consumptions table gains an `Agreement` column of `-`, because neither model names a relationship on a consumption); they were reverted and not committed, for the lead to regenerate. Both models still report 0 diagnostics and their `.ods` output did not change.
- **developer** (2026-09-29T15:10:00.000Z): Tests. Core `packages/core/src/consumable-map.test.ts`, graphviz `consumable-map-agreement.test.ts`, doc `consumptions.test.ts`, pages `ConsumesTable.test.ts` (RiverMart's WarehouseAPI), `ConsumableEdge.test.ts`, `consumable-graph.test.ts`, and `packages/pages/e2e/consumption-agreement.spec.ts` (viewer route, RiverMart's `purchaseOrderLookup` and `legacyStockFeed`). The e2e ran against a throwaway config on port 4183 that was deleted afterwards.
- **developer** (2026-09-29T15:10:00.000Z): Left alone: the Consumptions tables in `packages/doc/src/domain.md.ts` and `subdomain.md.ts`, which the spec does not name.
