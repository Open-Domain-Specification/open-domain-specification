# SchemaPage

`packages/pages/src/lib/templates/SchemaPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `DefinitionList`, `AttributesSection`, `Section`, `DataTable`,
`Lockup`, `Keyword`, `LanguageSection`, `EmptyState`.

## Layout

```
Swagger Petstore (v3) › Catalog BC
{} PetId  pet_id  Schema
Identifies one pet; shared by every consumable that only needs the id
Published by   ⬚ Catalog BC

Attributes  (1)                                  (AttributesSection)

Carried by  (6)                                  (Section)
  Consumable         Kind                          Provider
  📡 PetUpdated      event      published-language ⬚ Pet
  ⚡ ReservePet      operation  open-host-service  ⬚ Pet

In the ubiquitous language                       (LanguageSection)
```

The carried-by table is already a table; its `ConsumableChips` cell becomes
keywords.
