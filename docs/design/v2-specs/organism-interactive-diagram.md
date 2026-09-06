# InteractiveDiagram

`packages/pages/src/lib/organisms/InteractiveDiagram.svelte`. Verdict: keep.

The diagram language (nodes, edges, ports, legend, sketch backdrop) is
outside this card; it already maps its overlays onto the host tokens
(`assets/page.css`, the `--xy-*` block). The flow files got their own card
(card 64, `flow-diagram-panels.md`), which settled the give-way order the two
panels take when the fit runs out of room. One touch from this card is still
open, tracked there rather than repeated here:

- The legend and options panels still carry the rounded `editorWidget` frame
  (`--card`/`--border`/`--radius` in `assets/page.css`) that both
  `LegendPanel.svelte` and `DiagramOptionsPanel.svelte` share. They should
  lose it in favour of a 1px `panel.border` rule and the editor background,
  matching the `DataTable` and `DiagramFigure` treatment — a future card's
  work, not this one's.
- Port badges keep their pill: a port badge on an edge is a place where a
  native diagram surface would use one. The disposition marks on them
  (RFC-002 section 4.2) follow `Disposition`: warning colour for refactor,
  outlined for tolerated.

Hover disclosures on edges and badges use the `HoverCard` frame.
