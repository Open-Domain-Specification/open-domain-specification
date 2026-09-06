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

Value objects  (4)                               (Section: DataTable)
    Value object  Attributes  Held by   Description
    ⬚ Category    2           ⬚ Pet     The kind of animal, e.g. Dogs ...
    ⬚ PetStatus   1           ⬚ Pet     Where a pet is in its life at the store

Integration surface  (14)                        (Section)
  [consumable map figure]
  Provides  (14)                                 (Heading 3, provides DataTable, sortable Consumable and Kind)
  Consumes  (0)                                  (Heading 3, consumes DataTable)

Reactions  (1)                                   (Section)
  Policies  (0)                                  (Heading 3, DataTable policy, when, then, description)
  Processes  (1)                                 (Heading 3, DataTable process, starts, while it runs, then, ends, description)
  [flow map figure]                              (under the pair, it summarises both)

Schemas  (4)                                     (Section)
  ⬚ PetRegistered  carried by 📡 PetRegistered   (Heading 3 lockup + secondary detail)
    What the outside learns when a pet joins the catalog
        Attribute  Type  Description
  ...

Ubiquitous language  (3)                         (Section: DataTable term, definition, also, embodied by)
```

The aggregate cards become one table whose numeric columns replace the
`·`-joined counts line; the description is the last column and wraps.
Services likewise. Value objects belong to the context, not to an aggregate
(decision 16), so they are a section of their own between Model and
Integration surface: one row per value object, `Held by` the aggregates
whose entities are typed by it, and a warn keyword `nothing` when none is.
The aggregate table's `Value objects` count is the number each aggregate
holds, not owns. Schemas are subsections with their attribute table, not
cards in a grid. The provides table is the densest surface on any page and
is the reference for `DataTable`'s density story.

Policies and processes are one **Reactions** section, not two sections
(card 88): they answer one question — what this context does when something
happens — and they differ only in whether the reaction remembers what has
arrived. They are the paired level-3 headings the language asks for, both
drawn at zero, and the flow map comes under the pair because it summarises
both tables rather than either one. The section's count badge is the
policies and the processes together.
