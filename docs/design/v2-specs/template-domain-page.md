# DomainPage

`packages/pages/src/lib/templates/DomainPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `Section`, `DataTable`, `Lockup`, `Keyword`, `Ref`,
`DiagramFigure`, `EmptyState`.

## Layout

```
Swagger Petstore (v3)
⬚ Petstore Commerce  petstore_commerce  Domain
Core pet catalog, sales, and inventory capabilities ...

Subdomains  (4)                                  (Section)
  Subdomain    Classification   Served by                    Description
  ⬚ Catalog    core             ⬚ Catalog BC, ⬚ Inventory BC Pet definitions, attributes, lifecycle ...
  ⬚ Sales      core             ⬚ Sales BC                   Orders and order lifecycle ...
  ⬚ Inventory  supporting       ⬚ Inventory BC               Aggregated availability by status ...

Contexts serving this domain                     (Section: context map figure)
```

`SubdomainCard` becomes a row. Classification is a sortable `Keyword`
column (the colour goes; the sortable column is the replacement). Served-by
is comma-separated context `Ref`s with a `warn` keyword after a big ball of
mud. The description is last and wraps.
