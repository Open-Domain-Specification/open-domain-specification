# AggregatePage

`packages/pages/src/lib/templates/AggregatePage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `Section`, `DiagramFigure`, `Heading` 3, `Lockup`, `Keyword`,
`DataTable`, `DefinitionList`, `Ref`, `Comments`, `EmptyState`.

## Layout

```
Swagger Petstore (v3) › Catalog BC
⬚ Pet  pet  Aggregate
A pet listed in the store ...
Root       ⬚ Pet                    (or Keyword "no root entity", error tone)
Context    ⬚ Catalog BC

Consistency boundary                         (Section)
  [relation map figure]

Structure  (5)                               (Section)
  Entities  (1)                              (Heading 3)
  ⬚ Pet  aggregate root                      (Heading 3: Lockup + Keyword)
    The listed animal; everything else in the aggregate hangs off it
        Attribute   Type          Description
    🔑  id          int64
        name        string
    includes ⬚ Category  0..1  categorised-as   (relations: rows of keyword + Ref + secondary)
  Value objects  (4)
  ⬚ Category
    ...

Invariants  (2)                              (Section: DataTable of Lockup, description, constrains)

Provides  (7)                                (Section)
  Operations  (3)
  ⚡ ChangePetStatus  operation  internal    (Heading 3 lockup + keywords)
    Move a pet between available, pending and sold ...
    Payload     ⬚ PetStatusChanged            (DefinitionList)
    Raises      📡 PetStatusChanged
    Consumed by ⬚ OrderApp
        Attribute  Type  Description           (payload attributes table)
  Events  (4)
  ...

Integration                                  (Section)
  [consumable map figure]
  Consumes                                   (Heading 3, DataTable)
```

Each entity, value object and consumable is a level-3 subsection headed by
its lockup and keywords, then its description, then a definition list of its
facts and its attribute table. Subsections are separated by 16px, not by
frames. The root entity is marked by the keyword `aggregate root` after its
name; the purple glow goes. Relations render as rows: relation word as a
keyword, target `Ref`, cardinality and label in secondary text.

Invariants become one table (see
[organism-invariants-section](organism-invariants-section.md)).
