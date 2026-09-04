# TermPage

`packages/pages/src/lib/templates/TermPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `Keyword`, `DefinitionList`, `Section`, `Lockup`, `DataTable`,
`Ref`, `EmptyState`.

## Layout

```
Swagger Petstore (v3) › Catalog BC
📖 Category  category  Glossary term
Species                                          (aliases as keywords, title "alias")
The kind of animal a pet is, such as Dogs or Cats
Language of   ⬚ Catalog BC

Embodied by                                      (Section)
  ⬚ Category   The kind of animal, e.g. Dogs. A value because two pets in Dogs share one category
                                                 (one row: lockup + description)

Same word elsewhere  (1)                         (Section)
  Context          Definition
  ⬚ Sales BC       The bucket an order's line falls in ...   (definition is a Ref to that term)
```

The embodied element loses its card for a single row. Aliases are keywords.
