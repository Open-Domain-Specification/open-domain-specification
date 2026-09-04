# PolicyPage

`packages/pages/src/lib/templates/PolicyPage.svelte`. Verdict: restyle.

## Primitives

`PageHeader`, `DefinitionList`, `Section`, `DataTable`, `Lockup`, `Keyword`,
`Ref`, `LanguageSection`, `EmptyState`.

## Layout

```
Swagger Petstore (v3) › Sales BC
⚖ ReserveOnOrderApproved  reserve_on_order_approved  Policy
When an order is approved, reserve its pet
Lives in   ⬚ Sales BC

When  (1)                                        (Section)
  Event               Provider     Context        Description
  📡 OrderApproved    ⬚ Order      ⬚ Sales BC     An order was approved ...

Then  (1)                                        (Section)
  Operation           Kind                        Provider   Context        Description
  ⚡ ReservePet       operation  open-host-service ⬚ Pet     ⬚ Catalog BC   available → pending ...

In the ubiquitous language                       (LanguageSection)
```

The `consumableRefCard` snippet becomes a row: consumable lockup, its
keywords, provider and context lockups, description last. The `·` joined
meta line goes; each fact is a column.
