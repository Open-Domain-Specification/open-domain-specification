---
column: done
labels: [frontend, ddd]
priority: med
agent: claude
live: false
clean-code-swept: true
updatedAt: 2026-09-03T13:20:00.000Z
---
# Interactive diagrams with Svelte Flow

Add `@xyflow/svelte` to the pages library and offer an interactive view beside each static Graphviz figure: the context map, the consumable map and the aggregate relation map become pannable, zoomable node graphs with auto layout, where clicking a node navigates to its element. The Graphviz SVG stays as the default and for export to images. Depends on boards/project-backlog/24-browser-viewer-replaces-ods-ui.md. See decisions/12-one-renderer-three-hosts.md.

## Checklist

- [x] Map the core map models (`ODSContextMap`, `ODSConsumableMap`, `ODSRelationMap`) to Svelte Flow nodes and edges with auto layout
- [x] `InteractiveDiagram` organism with custom node components styled like the pages, and a toggle in `DiagramFigure`
- [x] Node click navigates by ref; edge labels carry relationship and cardinality
- [x] Stories for each map on the petstore example
- [x] Docs page update

## Gates

- [x] clean-code-swept — three-reviewer sweep (SRP/KISS, DRY/dead, naming/coupling) over cards 24 and 25; findings above 0.3 fixed, none left as TODOs; root build and all 262 tests green, biome clean on pages and extension (claude, 2026-09-02T20:50:00.000Z)
- [x] qa-automated — root npm test green: 536 unit tests over ten packages (core 96, pages 365 at 100% coverage, graphviz 18, doc 14, skill 16, models 23, extension 4); 36 Playwright e2e headed; 5 real-VS-Code integration tests (claude, 2026-09-03T13:05:00.000Z)

## Comments

- **claude** (2026-09-02T20:10:00.000Z): Built on top of card 24. packages/pages/src/lib/flow/graph.ts:1-120 converts the context, consumable and relation maps into a neutral graph whose node ids are refs; packages/pages/src/lib/flow/layout.ts:1-45 lays it out with dagre. packages/pages/src/lib/flow/OdsNode.svelte:1-55 draws nodes like the page cards with an attribute compartment for class-diagram nodes, and packages/pages/src/lib/organisms/InteractiveDiagram.svelte:1-60 hosts Svelte Flow with background, controls and minimap; a node click sets the hash. packages/pages/src/lib/organisms/DiagramFigure.svelte:1-75 gained a `graph` prop and an interactive/static toggle in the caption, and every template passes its graph. The static SVG rule in packages/pages/assets/page.css:431-438 is scoped to the Graphviz image so it no longer collapses Svelte Flow's edge layer. Stories at packages/pages/src/lib/organisms/InteractiveDiagram.stories.svelte:1-20; adapter and layout tests at packages/pages/src/lib/flow/graph.test.ts:1-40. Verified in a browser from the export: relation map and context map toggle to the interactive view with edges, labels, roles and the minimap. The flow map has no figure on any page yet, so no adapter for it.
- **claude** (2026-09-02T20:50:00.000Z): Clean-code sweep. The package gitignore pattern `app` also matched `src/app`, so the app shell was missing from the previous commit; packages/pages/.gitignore:1-4 now anchors the build folders. The webview protocol is typed on both sides from packages/pages/src/protocol.ts:1-40 (`Bootstrap`, `HostMessage`, `WebviewMessage`), exported from the package root and used by apps/ods-vscode/src/pages/panel.ts:1-10; the panel now fails loudly when the bundle is missing. Core's consumption map node carries `type` (packages/core/src/consumable-map.ts:16-24) so the graph adapter no longer sniffs the ref. Shared the symmetric-relationship rule, extracted `InvariantsSection`, renamed the fixture module and `Model.renderDot`, added `--bg`, `--fg` and `--mono` tokens so the flow components stop reading VS Code variables directly, and deleted the unreferenced lib barrel.
- **claude** (2026-09-03T04:30:00.000Z): Options panel added top-right of every interactive diagram (packages/pages/src/lib/flow/DiagramOptionsPanel.svelte): handle placement fixed or floating, and edge style bezier, straight, step or smooth step. Floating handles use a custom edge (packages/pages/src/lib/flow/FloatingEdge.svelte) that attaches on the sides facing each other, with the geometry in packages/pages/src/lib/flow/floating.ts:1-70; choices persist per browser through packages/pages/src/lib/flow/options.svelte.ts:1-70. Nodes and edges are now raw state fed by an effect, which clears Svelte Flow's performance warning. Storybook: a global ModelDecorator (packages/pages/.storybook/ModelDecorator.svelte) provides the petstore model to every story, template stories carry default args, and docs source is pinned to static code to avoid serialising circular model objects; all 24 stories verified clean in a browser. Unit coverage back to 100 with 264 tests; e2e 25 including the options panel.
