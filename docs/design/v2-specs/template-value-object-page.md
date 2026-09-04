# ValueObjectPage

`packages/pages/src/lib/templates/ValueObjectPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `DefinitionList`, `AttributesSection`, `Section`, `DataTable`,
`Lockup`, `Keyword`, `Ref`, `InvariantsSection`, `LanguageSection`.

## Layout

```
Swagger Petstore (v3) › Catalog BC › Pet
⬚ Category  category  Value object
The kind of animal, e.g. Dogs ...
Aggregate   ⬚ Pet

Attributes  (2)                                  (AttributesSection)

Used as a type by  (3)                           (Section)
  Attribute   On             In
  category    ⬚ Pet          ⬚ Pet
  category    {} PetRegistered   ⬚ Catalog BC

Relations  (0)                                   (Section: relation keyword, target lockup, cardinality)
Constrained by  (0)                              (InvariantsSection)
In the ubiquitous language                       (LanguageSection)
```

Same shape as the entity page; the usage table is already a table and only
its cells change (attribute in the editor font, owners as lockups).
