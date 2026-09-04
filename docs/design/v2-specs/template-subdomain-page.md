# SubdomainPage

`packages/pages/src/lib/templates/SubdomainPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `Keyword`, `DefinitionList`, `Section`, `DataTable`, `Lockup`,
`DiagramFigure`, `EmptyState`.

## Layout

```
Swagger Petstore (v3) › Petstore Commerce
⬚ Catalog  catalog  Subdomain
core                                             (keyword line, with the classification summary as its hover)
Pet definitions, attributes, lifecycle ...
Classification   Core: the differentiator. Invest the best people and the richest model here.

Served by  (2)                                   (Section)
  Context          Team               Description
  ⬚ Catalog BC     👥 Pet Shop Team   Owns the Pet aggregate ...
  ⬚ Inventory BC   👥 Pet Shop Team   Projection of pet availability ...

Context map                                      (Section: figure)
```

The empty "Classification" section goes: the classification is the keyword
under the title and one definition in the header. Served-by cards become
rows.
