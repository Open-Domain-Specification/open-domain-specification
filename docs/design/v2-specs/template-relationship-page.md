# RelationshipPage

`packages/pages/src/lib/templates/RelationshipPage.svelte`. Verdict: restyle.

## Primitives

`Ref` (crumbs), `RelationshipDetail` with `heading="h1"`.

## Layout

```
Swagger Petstore (v3) › Catalog BC › Inventory BC
⬚ Catalog BC ↔ ⬚ Inventory BC   shared-kernel   ⚠ refactor     (title lockups)
PetStatus and its values are one shared definition
Roles ... Comments ... Consumables crossing this boundary ... Links
```

The page is the crumbs line and the detail block at page level; the crumb
kind eyebrow ("RELATIONSHIP") goes, the title is the two context lockups at
title size. See [organism-relationship-detail](organism-relationship-detail.md).
