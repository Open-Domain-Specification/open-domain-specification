# ServicePage

`packages/pages/src/lib/templates/ServicePage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `Keyword`, `DefinitionList`, `Section`, `DiagramFigure`,
`Heading` 3, `DataTable`, `EmptyState`.

## Layout

```
Swagger Petstore (v3) › Catalog BC
⬚ PetApp  pet_app  Service
application                                      (keyword line)
Open-host service for /pet endpoints
Kind      Application service: orchestrates a use case across aggregates ...
Context   ⬚ Catalog BC

Integration  (9)                                 (Section)
  [consumable map figure]
  Provides  (9)                                  (Heading 3, provides DataTable)
  Consumes  (0)                                  (Heading 3, consumes DataTable)
```

The service type chip becomes a keyword line; the long explanation stays in
the definition list. Provides and consumes are the shared tables.
