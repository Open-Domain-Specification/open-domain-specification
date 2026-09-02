

# Swagger Petstore (v3)
DDD/ODS model for Swagger Petstore v3. Inventory is a projection returning a status→count map; Orders use placed|approved|delivered.

![contextmap](./contextmap.svg)

[Glossary](./glossary.md)

## Domains


### [Petstore Commerce](../domains/petstore_commerce/index.md)
Core pet catalog, sales, and inventory capabilities: everything that turns a listed pet into a delivered one



### [Identity & Accounts](../domains/identity_&_accounts/index.md)
Users and sessions per Petstore API; kept as its own domain because it would be bought rather than built



## Diagnostics
> No diagnostics.

## Teams
| Team | Owns |
| --- | --- |
| Pet Shop Team | Catalog BC, Inventory BC |
| Orders Team | Sales BC, Fulfilment BC |
| [Platform Team](https://petstore.swagger.io/#/user) | Identity BC |


## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Catalog BC | customer-supplier | Sales BC | open-host-service | anti-corruption-layer |
| Sales BC | upstream-downstream | Inventory BC | published-language | conformist |
| Catalog BC | shared-kernel | Inventory BC | - | - |
| Sales BC | partnership | Fulfilment BC | - | - |
| Identity BC | separate-ways | Sales BC | - | - |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [OrderApp](../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | GetPetSummary | open-host-service |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Pet | PetRegistered | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Pet | PetStatusChanged | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Pet | PetDeleted | published-language |
| [OrderApp](../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | Pet | ReservePet | open-host-service |
| [OrderApp](../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | Pet | MarkPetSold | open-host-service |
| [InventoryQuery](../boundedcontexts/inventory_bc/services/inventory_query/index.md) | - | InventoryProjection | InventoryUpdated | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderApproved | published-language |
| [Shipment](../boundedcontexts/fulfilment_bc/aggregates/shipment/index.md) | conformist | Order | OrderApproved | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderDelivered | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderDeleted | published-language |
	

