# HealthReport

`packages/pages/src/lib/organisms/HealthReport.svelte`. Verdict: restyle.

## Primitives

`Heading` (level 3 with `count`), `DataTable` (grouped for Refactor),
`Lockup`, `Keyword`, `Disposition`, `Comments`, `EmptyState`.

## Layout

```
Refactor  (1)                                          (Heading 3, count badge)
  Catalog BC                                            (group label row)
  ⬚ Catalog BC ↔ ⬚ Inventory BC   shared-kernel   ⚠ refactor
     💬 PetStatus and its values live in @petstore/kernel ...  code ↗
     💬 It should become a Published Language from Catalog.   decision ↗

Tolerated  (1)
  ⬚ Sales BC → ⬚ Inventory BC     upstream-downstream   ⓘ tolerated
     💬 The projection conforms to the Sales order events ...   code ↗

› No comments  (2)                                      (collapsed, chevron)
```

The three stat tiles go; the three numbers are the count badges on the three
level-3 headings, which is how a pane header carries its count. Each section
is a `DataTable` with columns: intent (two `Lockup`s with the arrow as
secondary text), type (`Keyword`), disposition (`Disposition`); the
`Comments` for the row render in a full-width row under it, indented by the
gutter, so the comments read as the row's detail. Refactor keeps its grouping
by counterpart context as group label rows.

No comments stays collapsed behind a chevron button in the heading, as
today; when open it is the same table without a comments row.

Empty sentences unchanged, rendered by `EmptyState`.
