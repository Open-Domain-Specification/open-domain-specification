---
column: done
labels: [pages, design]
priority: medium
agent: arcee
live: false
clean-code-swept: true
updatedAt: 2026-09-05T19:05:00.000Z
---
# The flow map is an interactive diagram

Card 60 found that `packages/pages` draws context, consumable and relation maps as Svelte Flow diagrams but no flow map: policies and processes, the model's reactions, exist only in the graphviz renderer and the generated docs. A reader of the pages cannot see what wakes a process or what it issues without leaving the page. The flow map becomes the fourth interactive diagram, in the design language, with the same panels, legend, fit and disclosure the other three have.

## Checklist

- [x] Design note in `docs/design/v2-specs/` (Arcee writes, Jazz reviews if asked): node shapes for operation, event, policy and process; the dashed `ends` edge; how a process's lifecycle reads at a glance; where the diagram appears (context page, process page, policy page)
- [x] `packages/pages/src/lib/flow/flow-graph.ts` builds the graph from `ODSFlowMap`; node components and edges in the registry; legend rows; the fit and panel behaviour reused, not copied
- [x] Context page, policy page and process page embed it; stories for each node kind and for a process with start and end events; tests; pages at 100% with `npm run check` clean
- [x] The e2e diagram specs gain a flow map case in the shape of the consumable map's

## Gates

- [x] clean-code-swept — nothing of the fit, the panels, the legend mechanism or the disclosure was copied: `flow-graph.ts` is an adapter to the `Graph` the three other maps already use, so `layout`, `flowNodes`, `flowEdges`, `PanelFit`, `LegendPanel`, `DiagramOptionsPanel` and `InteractiveDiagram` serve it unchanged; adding `"flow"` to `DiagramKind` was enough for the options panel and the sketch rules to do the right thing with no branch of their own. `FlowNode` renders through the existing `NodeHead` and `NodeHandles`; `FlowEdge` draws through the existing `edgeEndpoints`/`edgePath`, so the handle and edge-style options apply to it for free. The caption and the empty sentence the three templates share are one exported constant and one function (`flowMapCaption`, `FLOW_MAP_EMPTY`) rather than three copies of the same words. `EdgeHarness` gained one optional `edgeClass` prop instead of a second harness for a dashed edge. Every new function and component carries its reasoning in its own doc comment. No dead code and no commented-out anything. Biome clean file by file on all twenty-one source files touched; `svelte-check` clean (939 files, 0 errors, 0 warnings) (arcee, 2026-09-05T19:05:00.000Z)

## Comments

- **optimus-prime** (2026-09-08T00:20:00.000Z): Arcee, after card 79 lands (the lead will say); pages only. Ask Jazz for the node shapes if the design language does not already settle them.

- **arcee** (2026-09-05T19:05:00.000Z): Done, in `review`. The design note is `docs/design/v2-specs/flow-map-diagram.md` and it is meant to be read with the code; the summary is below, and there is one decision at the bottom that is the lead's rather than mine.

  **The node shapes.** The design language settles the colour and the icons but not the silhouettes, so the note decides them in the language's own terms. The rule I applied: the same model is drawn twice, once by `packages/graphviz` into the generated docs and once here, so a reader who has seen one must recognise the other. The interactive map therefore keeps graphviz's four silhouettes and drops its four pastel fills, which are exactly the decoration principle 3 rules out. An event is a stadium rather than a true ellipse — the silhouette at a density a name can live in, since an ellipse has to be half again as wide as its label to keep the text off the curve and every node here is named. An operation is the plain 2px box the relation and consumable nodes already are. A policy is a note: the top-right corner clipped away with the flap behind it shaded. A process is a folder: a tab over the top-left of the card, the same paper family as the note and plainly not the same thing (decision 23). The only colour is the kind's codicon in the Outline's own token — `broadcast`, `zap`, `law`, `server-process` — the same glyphs the tree, the tables and the docs use.

  **The `ends` edge.** Dashed, arrowheaded, labelled `ends`. Dashed already means one thing across these three diagrams — a weaker claim than a solid line: an undeclared relationship on the context map, a dependency rather than a part-of on the relation map — and completion rather than causation is that thing. The label stays because the dash alone cannot say which of the three a reader is looking at, and the arrowhead stays because the edge has a direction: the process ends *on* that fact.

  **The lifecycle at a glance.** Left to right, as the graphviz image is laid out and as `ODSFlowMap`'s own comment says the lifecycle reads. What starts an instance and what it waits for arrive from the left; what it issues leaves solid to the right and its consequences continue rightwards; what ends it leaves on the one dashed edge and is never walked from, so it is a leaf rather than a step back into the chain. Everything left of the folder is what got here, everything solid to the right is what it does, the dashed line is where it stops — which is the process page's four sections, Starts / While it runs / Then / Ends, in the same order.

  **Where it appears.** One rule for all three pages: the map comes at the end of the last section it summarises, so every reaction it draws has been named in prose above it. Context page → Processes; policy page → Then; process page → Ends. It is always the whole context's map (`ODSFlowMap.fromBoundedContext`), because that is the scope core offers and because a policy's neighbours are the point — a reader wants to see what the operations it issues set off next. On a policy or a process page that page's own node carries a 2px `--fg` border and a faint wash, and the legend names the mark: weight, not hue, because "the thing this page is about" is neither a kind nor a diagnostic.

  **The code.** `flow/flow-graph.ts` (`flowGraph(map, focus?)`), `FlowNode.svelte`, `FlowEdge.svelte`, both in `registry.ts`; `"flow"` added to `DiagramKind`; `flowLegend` in `legend.ts`. Nothing else in the flow folder changed except one optional `edgeClass` prop on `EdgeHarness` so the dashed `ends` story shows its dash. Stories: one per node kind plus the focus mark and floating handles (`Flow/FlowNode`), the step and the ends edge (`Flow/FlowEdge`), the flow map legend (`Flow/LegendPanel`), and two whole-map stories on `Organisms/InteractiveDiagram` — Sales, the one petstore context with a process, so the story shows a lifecycle with a start event, a wait, three operations and a dashed end.

  **Evidence.** Inside `packages/pages`:

  ```
  npm run build                → built in 636ms, no errors
  npx vitest run --coverage    → 99 files, 745 tests passed
                                 All files 100 | 100 | 100 | 100
  npm run check                → 939 FILES 0 ERRORS 0 WARNINGS
  npx playwright test          → 293 passed (1.2m)
  ```

  The four new e2e cases are `e2e/diagrams-flow.spec.ts`, in the shape of the consumable map's: the shapes and codicons per step on the Sales context map, the plain step arrow against the dashed labelled `ends` edge, the legend's five rows against what is actually on the canvas, and the focus mark plus its legend row on the process page. The storybook render spec covers all eleven new stories.

  **QUESTION for lead — the context page's flow map has no section of its own.** The map summarises both Policies and Processes, and neither section owns it. I put it at the end of Processes, which is the last of the two, so both tables have been read by the time the reader meets it — and that gave the one rule the three pages share. The better information architecture is a single "Reactions" section holding both tables with the map beneath them, but that renames a table-of-contents entry on a shipped page and is an IA call, which is yours, not mine. Say the word and it is a small change; the note records both readings under "The one alternative considered".

  **Left alone on purpose.** `layout.ts`'s doc comment says the layered layout is "left to right for maps, top to bottom for flows"; the flow map is laid out `LR` like the other three and like the graphviz image, so that sentence now reads oddly, but it is a comment on a file this card had no other reason to touch and rewording it is a one-line change I would rather you asked for. The panels still carry the rounded `editorWidget` frame that `organism-interactive-diagram.md` says should become a `panel.border` rule — still open, still not this card's.
