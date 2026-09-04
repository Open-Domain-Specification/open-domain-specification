# InteractiveDiagram

`packages/pages/src/lib/organisms/InteractiveDiagram.svelte`. Verdict: keep.

The diagram language (nodes, edges, ports, legend, sketch backdrop) is
outside this card; it already maps its overlays onto the host tokens
(`assets/page.css`, the `--xy-*` block). Two touches when the flow files get
their own card:

- The legend and options panels lose their rounded `editorWidget` frame in
  favour of a 1px `panel.border` rule and the editor background, matching
  the `DataTable` and `DiagramFigure` treatment.
- Port badges keep their pill: a port badge on an edge is a place where a
  native diagram surface would use one. The disposition marks on them
  (RFC-002 section 4.2) follow `Disposition`: warning colour for refactor,
  outlined for tolerated.

Hover disclosures on edges and badges use the `HoverCard` frame.
