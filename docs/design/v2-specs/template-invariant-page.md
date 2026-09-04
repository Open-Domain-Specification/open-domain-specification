# InvariantPage

`packages/pages/src/lib/templates/InvariantPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `DefinitionList`, `Section`, `DataTable`, `Lockup`,
`LanguageSection`, `EmptyState`.

## Layout

```
Swagger Petstore (v3) › Catalog BC › Pet
🛡 SoldNotReopen  sold_not_reopen  Invariant
Once sold, a pet does not revert to available without an explicit policy ...
Enforced by   ⬚ Pet

Constrains  (1)                                  (Section)
  Element     Description
  ⬚ Pet       The listed animal; everything else in the aggregate hangs off it

In the ubiquitous language                       (LanguageSection)
```

The grid of target cards becomes a two-column table. Empty: `EmptyState
"Applies to the aggregate as a whole."`.
