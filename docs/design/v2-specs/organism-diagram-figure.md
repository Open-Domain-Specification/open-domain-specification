# DiagramFigure

`packages/pages/src/lib/organisms/DiagramFigure.svelte`. Verdict: restyle.

## Primitives

`EmptyState`; the canvas is `InteractiveDiagram`, unchanged.

## Layout

```
────────────────────────────────────────────────────── (hairline, panel.border)
                    [ interactive canvas, 60vh ]
────────────────────────────────────────────────────── (hairline)
Catalog BC context map                                  (secondary text, 22px)
```

The rounded `editorWidget` frame goes. The figure is the canvas between two
hairlines at the page's full width, the caption below in the secondary
colour at row height, left aligned. This is how the editor shows an embedded
image preview: content, a rule, a caption.

Empty: `EmptyState` with the caller's sentence, no hairlines.
