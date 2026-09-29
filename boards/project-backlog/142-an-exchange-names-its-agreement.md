---
column: doing
labels: [pages, doc]
priority: medium
agent: developer
live: false
updatedAt: 2026-09-29T23:30:00.000Z
---
# An exchange names its agreement

Issue #55, a child of epic #62. A consumption can name the relationship it runs under and the context map draws one line per named agreement, but no page or table said which agreement a given exchange belongs to, so a reader of two contexts holding two agreements had to infer it. The consumes tables on the aggregate, service, context and consumable pages now name the agreement where the consumption names one, the consumable map's edge carries it, and Markdown states it. The design is Spec 2 and the Lead rulings of `docs/design/v2-specs/relationship-provenance-and-agreements.md`. No metamodel change: the fact was already recorded on `Consumption.relationship`. The epic's acceptance is that a reader can identify the exact agreement for a consumption that names one without inferring it from the context pair, covered for more than one agreement between the same two contexts.

## Checklist

- [x] Failing tests first, on a fixture of two contexts holding two named agreements with a consumption under each and one that names none
- [x] Core: `ODSConsumptionMapEdge.agreement` from `consumption.relationship`
- [x] Pages: an "Agreement" column on `ConsumesTable`, shown only when a row names one, a `Ref` to the relationship page, empty where none
- [x] Pages: the consumable edge's hover gains "Under the {name} agreement" after "Made by"
- [x] Graphviz: the consumable map's edge label and tooltip
- [x] Doc: the `Agreement` bullet on a consumption, and an `Agreement` column, after `Consumed As`, in the Consumptions table of a context, domain and subdomain page, present only where a row in that table names an agreement
- [x] A Playwright assertion on RiverMart's two agreements
- [x] Pages coverage stays at 100%; core, graphviz, doc and pages unit suites and `npm run check` green
- [x] Reference models' diagnostics unchanged; petstore and clinic docs byte-identical after a rebuild

## Gates

- [x] `npx @biomejs/biome check` on the touched files exits 0 (root `biome check .`: no fixes, 2026-09-29)
- [x] `bash scripts/verify-all.sh` green on c3ae0910 (lead, 2026-09-29): core 1040, graphviz 35, doc 44, pages 906 at 100% coverage, pages e2e passed including `cross-surface-facts`, every model suite at its pinned count, schema comparison match

## Comments

- **developer** (2026-09-29T15:10:00.000Z): Core `packages/core/src/consumable-map.ts:84-93` adds `agreement` to the edge only where the consumption names a relationship; the type is at `:170`. `ref` is `relationship.ref`, the same string the relationship page route matches (`packages/pages/src/lib/resolve.ts:68`). Two agreements between one pair give two distinct refs, and the edge id is an object hash, so an exchange under each stays its own edge.
- **developer** (2026-09-29T15:10:00.000Z): Pages `packages/pages/src/lib/molecules/ConsumesTable.svelte:33-40` derives the column list from `consumptions.some((x) => x.relationship)`, and `:59-67` renders the cell as a `Ref` labelled `name ?? type` with `ICONS.relationship` and the title "The relationship this exchange runs under."; a row naming none renders an empty cell. `flow/consumable-graph.ts:127` passes the resolved name (name, else type) as a plain string, through `flow-nodes.ts` and `graph.ts` into the edge's data, and `flow/ConsumableEdge.svelte:98-108` joins the hover lines with a newline. The midpoint label is unchanged. The spec said to pass `e.agreement?.name`; the resolved name is passed instead so an unnamed agreement, which the spec also wants the type for, needs no second field.
- **developer** (2026-09-29T15:10:00.000Z): Graphviz `packages/graphviz/src/consumable-map.ts:104-127` labels the edge `${consumable}\n${agreement}` with the tooltip `Under the ${agreement} agreement`, and adds the tooltip only where an agreement is named, so an unnamed exchange's DOT is byte-identical to before.
- **developer** (2026-09-29T15:20:00.000Z): Markdown `packages/doc/src/consumptions.md.ts:20-23` (`agreementMd`, after Provider and Made by) adds the bullet. `consumptionsTableMd` (`:33`) is the one function that builds the Consumptions table for `boundedcontext.md.ts:234`, `domain.md.ts:40` and `subdomain.md.ts:44`: it inserts the `Agreement` column after `Consumed As` only when some row in that table names a relationship, with `-` for a row that names none. Petstore and clinic name none, so after the lead's ruling their `docs` are byte-identical: both builds report 0 diagnostics and the tree shows no change under `models/`. This replaces my first version, which always added the column and would have changed nine tracked files.
- **developer** (2026-09-29T15:10:00.000Z): Tests. Core `packages/core/src/consumable-map.test.ts`, graphviz `consumable-map-agreement.test.ts`, doc `consumptions.test.ts`, pages `ConsumesTable.test.ts` (RiverMart's WarehouseAPI), `ConsumableEdge.test.ts`, `consumable-graph.test.ts`, and `packages/pages/e2e/consumption-agreement.spec.ts` (viewer route, RiverMart's `purchaseOrderLookup` and `legacyStockFeed`). The e2e ran against a throwaway config on port 4183 that was deleted afterwards.
- **developer** (2026-09-29T15:20:00.000Z): Doc tests are in `packages/doc/src/consumptions.test.ts`: the column and the `-` on the context, domain and subdomain tables, and no column on any of the three where no row names an agreement. The relationship page's heading not naming the agreement is left alone, out of this issue's scope (lead).
- **lead** (2026-09-29T23:30:00.000Z): Integrated on the epic 62 branch in the epic's order (#44, #43, #55, #56, then the cross-surface pass). The landing gate passed on c3ae0910, and `npm run test:vscode` passed on the same commit in real VS Code 1.96.4: cross-surface 4 passing, hostile-links 1, petstore 9 (4 pending screenshots). The card stays in `doing` until PR 73 merges.
