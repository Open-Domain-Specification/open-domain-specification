# Toc

`packages/pages/src/lib/organisms/Toc.svelte`. Verdict: restyle.

## Primitives

None new; a list of links.

## Layout

```
On this page                                (secondary text, sentence case)
│ Strategic position
│ Model
▌ Integration surface                       (active: link colour, 2px left rule)
│ Policies
```

The uppercase, tracked `toc-title` becomes plain secondary text. The list
keeps its 1px left rule in `panel.border` and the 2px active marker in the
link colour; rows are 22px. Nothing else changes; this is already the shape
of the Outline view's breadcrumb list.
