# TeamPage

`packages/pages/src/lib/templates/TeamPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `Ref` (external, for the homepage), `Section`, `DataTable`,
`Lockup`, `Keyword`, `EmptyState`.

## Layout

```
Swagger Petstore (v3)
👥 Pet Shop Team  pet_shop_team  Team
Owns the catalog and the inventory projection built from it
Homepage   pet-shop.example ↗                    (external Ref, only when set)

Owns  (2)                                        (Section)
  Context          Aggregates  Services  Description
  ⬚ Catalog BC     1           1         Owns the Pet aggregate ...
  ⬚ Inventory BC   1           1         Projection of pet availability ...

Problem space covered  (2)                       (Section)
  Subdomain    Classification   Description
  ⬚ Catalog    core             Pet definitions ...
  ⬚ Inventory  supporting       Aggregated availability ...
```

Both grids of cards become tables with numeric columns for the counts.
