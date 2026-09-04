# EntityPage

`packages/pages/src/lib/templates/EntityPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `Keyword`, `DefinitionList`, `AttributesSection`, `Section`,
`DataTable`, `Ref`, `InvariantsSection`, `LanguageSection`.

## Layout

```
Swagger Petstore (v3) › Catalog BC › Pet
⬚ Pet  pet  Entity
aggregate root                                   (keyword line, only for the root)
The listed animal; everything else in the aggregate hangs off it
Aggregate   ⬚ Pet
Identity    id                                   (editor font; or keyword "no identity attribute marked")

Attributes  (6)                                  (AttributesSection)

Relations  (4)                                   (Section)
  Outgoing  (4)                                  (Heading 3)
    Relation   Target        Cardinality   Label
    includes   ⬚ Category    0..1          categorised-as
    uses       ⬚ Tag         *             tagged-with
  Incoming  (0)

Constrained by  (2)                              (InvariantsSection)
In the ubiquitous language                       (LanguageSection)
```

The `aggregate root` chip becomes a keyword line under the title. Relations
become two small tables: relation word as a keyword, target as a lockup,
cardinality and label in the editor font and secondary colour.
