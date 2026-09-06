# ValueObjectPage

`packages/pages/src/lib/templates/ValueObjectPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `DefinitionList`, `AttributesSection`, `Section`, `DataTable`,
`Lockup`, `Keyword`, `Ref`, `InvariantsSection`, `LanguageSection`.

## Layout

```
Swagger Petstore (v3) › Catalog BC
⬚ Category  category  Value object
The kind of animal, e.g. Dogs ...
Context     ⬚ Catalog BC

Attributes  (2)                                  (AttributesSection)

Used as a type by  (3)                           (Section)
  Attribute   On             In
  category    ⬚ Pet          ⬚ Pet
  category    {} PetRegistered   ⬚ Catalog BC

Relations  (0)                                   (Section: relation keyword, target lockup, cardinality)
Constrained by  (0)                              (InvariantsSection)
In the ubiquitous language                       (LanguageSection)
```

Same shape as the entity page, except the value object belongs to the
context (decision 16): the crumbs stop at the context, the one header fact
is `Context`, and `Constrained by` gathers the invariants of every aggregate
in the context that name it. The usage table is already a table and only
its cells change (attribute in the editor font, owners as lockups).
