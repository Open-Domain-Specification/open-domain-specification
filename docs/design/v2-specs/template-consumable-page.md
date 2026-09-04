# ConsumablePage

`packages/pages/src/lib/templates/ConsumablePage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `Keyword`, `Disposition`, `DefinitionList`, `Section`,
`DataTable`, `Ref`, `Comments`, `LanguageSection`, `EmptyState`.

## Layout

```
Swagger Petstore (v3) › Catalog BC › Pet
📡 PetStatusChanged  pet_status_changed  Event
event   published-language                      (keywords line; "internal" when so)
Pet status changed (available|pending|sold)
Provided by   ⬚ Pet
Payload       ⬚ PetStatusChanged
Disposition   ⓘ tolerated                       (only when not by design)

Payload                                          (Section: attribute DataTable)
Raised by                                        (Section: comma-separated Refs)
Reacted to by                                    (Section: DataTable of policy lockup, context, description)
Consumed by                                      (Section: consumes DataTable)
Comments  (2)                                    (Section: Comments)
In the ubiquitous language                       (Section)
```

The header's chips (`ConsumableChips`, `DispositionChip`) become a keyword
line under the title and a `Disposition` definition. Raised-by and raises
lose their pills for comma-separated `Ref`s with the kind icon. Policies are
rows, not cards. Comments use `Comments` with the count on the heading.
