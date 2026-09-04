# ContextPage

`packages/pages/src/lib/templates/ContextPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `Section`, `StrategicPositionTable`, `DiagramFigure`,
`Heading` 3, `DataTable`, `Lockup`, `Keyword`, `Ref`, `EmptyState`.

## Layout

```
Swagger Petstore (v3)
⬚ Catalog BC  catalog_bc  Bounded context
big ball of mud                                  (warn keyword line, only when so)
Owns the Pet aggregate and the pet-facing operations
Serves     ⬚ Catalog  core                       (Ref + classification keyword)
Owned by   👥 Pet Shop Team

Strategic position  (3)                          (Section: table, then context map figure)

Model  (2)                                       (Section)
  Aggregates  (1)                                (Heading 3)
    Aggregate   Root      Entities  Value objects  Invariants  Operations  Events  Description
    ⬚ Pet       ⬚ Pet     1         4              2           3           4       A pet listed in the store ...
  Services  (1)
    Service     Kind         Description
    ⬚ PetApp    application  Open-host service for /pet endpoints

Integration surface  (14)                        (Section)
  [consumable map figure]
  Provides  (14)                                 (Heading 3, provides DataTable, sortable Consumable and Kind)
  Consumes  (0)                                  (Heading 3, consumes DataTable)

Policies  (0)                                    (Section: DataTable policy, when, then, description)

Schemas  (4)                                     (Section)
  ⬚ PetRegistered  carried by 📡 PetRegistered   (Heading 3 lockup + secondary detail)
    What the outside learns when a pet joins the catalog
        Attribute  Type  Description
  ...

Ubiquitous language  (3)                         (Section: DataTable term, definition, also, embodied by)
```

The aggregate cards become one table whose numeric columns replace the
`·`-joined counts line; the description is the last column and wraps.
Services likewise. Schemas are subsections with their attribute table, not
cards in a grid. The provides table is the densest surface on any page and
is the reference for `DataTable`'s density story.
