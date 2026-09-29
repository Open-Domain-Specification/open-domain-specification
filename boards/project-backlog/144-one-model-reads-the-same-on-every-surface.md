---
column: doing
labels: [pages, doc, tooling]
priority: medium
agent: developer
live: false
updatedAt: 2026-09-29T23:30:00.000Z
---
# One model reads the same on every surface

Epic #62, step 4: compare the same reference-model facts across all relevant renderers in a single integration pass. Cards 140 to 143 each fixed one fact on the surfaces it touched (#44 the relationship arrow, #43 a generated description, #55 the agreement an exchange runs under, #56 the kind of context an identity names) and each tested it where it changed. The epic's acceptance is that the VS Code webview, the static export, the viewer and generated Markdown stay consistent for each affected fact, that tests assert semantic content and provenance and not compilation alone, and that reference-model diagnostics are unchanged. This card holds one fixture workspace with every affected fact, one list of what each surface must say, and a harness on each surface that asserts it.

## Checklist

The fixture is `apps/ods-vscode/src/test/fixtures/cross-surface/.ods/cross_surface.json`, written by `generate.ts` beside it; the list is `expected.ts` beside that. Facts by surface (V = hosted viewer, S = static export, W = real VS Code webview, M = Markdown):

- [x] Fixture and expectations: authored and generated relationship, two named agreements with a consumption under each and one naming none, a tolerated relationship, identities into an external, a boundary-only and a big-ball-of-mud context; one diagnostic carried on purpose (`consumption-agreement`, the unnamed consumption)
- [x] #43 a generated description says so, an authored one is printed as written: V and S `cross-surface-facts.spec.ts`; W `cross-surface.test.ts`; M `cross-surface.test.ts` in `packages/doc` (`*sentence* (generated)`); RiverMart in `generated-description.spec.ts`
- [x] #55 each consumption names its agreement, as a link to the relationship, with an empty cell where none, and the map edge says "Under the X agreement": V, S and W as above; M the `**Agreement**` bullet, the context table's column with `-`, and the consumable map's edge label and tooltip; RiverMart in `consumption-agreement.spec.ts`
- [x] #44 the health report's label equals `relationshipTitle`, with each context its own link: V, S and W; Markdown writes no health report or relationship page, so there is no cell (stated in the test)
- [x] #56 the relation map draws «external system», «boundary only» and «big ball of mud»: V, S and W; M the relation map SVG the aggregate page embeds; the clinic's two external identity targets in the viewer
- [x] Test seam: the probe takes optional `selectors` and answers `probed`, inert without them; `App.test.ts` covers both branches and pages stays at 100%
- [x] One list: all four harnesses import `expected.ts`; the extension test compiles it because it sits under `src/test`, so no copy exists to drift
- [x] Reference models' diagnostics unchanged; petstore and clinic build with 0 diagnostics and no `models/*/docs` change

## Gates

- [x] `npx @biomejs/biome check` on the touched files exits 0 (root `biome check .`: no fixes, 2026-09-29)
- [x] `bash scripts/verify-all.sh` green on c3ae0910 (lead, 2026-09-29): core 1040, graphviz 35, doc 44, pages 906 at 100% coverage, pages e2e passed including `cross-surface-facts`, every model suite at its pinned count, schema comparison match
- [x] `npm run test:vscode` green (developer, 2026-09-29): the cross-surface suite reports 4 passing (a real Extension Development Host, VS Code 1.96.4), the petstore suite 9 passing and the hostile-links suite 1 passing, exit code 0

## Comments

- **developer** (2026-09-29T23:00:00.000Z): The fixture validates with one diagnostic, `consumption-agreement` on the Warehouse API's consumption of `StockChecked`: the pair holds two agreements in that direction and this consumption names neither, which is the empty-cell case #55 needs shown. Everything else the validator asked for (an operation for `by`, a policy behind each subscription, an operation raising each event, a subdomain for the boundary-only and mud contexts) is in the model, so the fixture carries no other warning.
- **developer** (2026-09-29T23:00:00.000Z): The seam is `HostMessage {type:"probe"; selectors?}` and `WebviewMessage {type:"rendered"; ...; probed?}` in `packages/pages/src/protocol.ts`, documented there and answered in `App.svelte`. `probed` maps each selector to its matches in document order, each as `{text, class, title, href}`. `DetailPanel.probe(selectors?)` passes it on. Nothing in normal use sends it.
- **developer** (2026-09-29T23:00:00.000Z): `expected.ts` holds values and no imports, so the Playwright and Vitest runs and the extension's own compile can all read it. It deliberately does not state the health label: each harness asks core for `relationshipTitle` and compares, so the glyph is stated once, in core. The hover text and the generated sentence are stated literally, so a wording change moves all four harnesses at once.
- **developer** (2026-09-29T23:00:00.000Z): `apps/ods-vscode/tsconfig.json` now excludes `src/test/fixtures`, and `tsconfig.test.json` excludes the generator, which uses `import.meta` and is run with node; `expected.ts` is compiled into `out/` for the extension test.
- **developer** (2026-09-29T23:00:00.000Z): The cross-surface pass found no inconsistency between surfaces for the four facts. The wording differs by surface as designed (the keyword `generated` on pages, `(generated)` in Markdown; an empty cell on pages, `-` in the Markdown column; a link on pages, plain text in Markdown).
- **lead** (2026-09-29T23:30:00.000Z): Integrated on the epic 62 branch in the epic's order (#44, #43, #55, #56, then the cross-surface pass). The landing gate passed on c3ae0910, and `npm run test:vscode` passed on the same commit in real VS Code 1.96.4: cross-surface 4 passing, hostile-links 1, petstore 9 (4 pending screenshots). The card stays in `doing` until PR 73 merges.
