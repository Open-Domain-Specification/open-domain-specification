

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

## Health
### Refactor
- **Catalog BC ↔ Inventory BC** (shared-kernel)
	- PetStatus and its values live in @petstore/kernel and both services compile against it. [packages/kernel/src/PetStatus.ts](https://github.com/example/petstore/blob/main/packages/kernel/src/PetStatus.ts)
	- The kernel has grown past the status enum and now carries pricing rules; it should become a Published Language from Catalog. [ADR-014 Shrink the kernel](https://github.com/example/petstore/blob/main/docs/adr/014-shrink-the-kernel.md)

### Tolerated
- **Sales BC → Inventory BC** (upstream-downstream)
	- The projection conforms to the Sales order events rather than translating them; accepted while Inventory stays read-only. [inventory/projection/OrderEventHandler.ts](https://github.com/example/petstore/blob/main/inventory/projection/OrderEventHandler.ts)

### No comments
> Every relationship carries at least one comment.


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
| [OrderApp](../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | ReservePetForOrder | open-host-service |
| [OrderApp](../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | MarkPetSoldForOrder | open-host-service |
| [PetApp](../boundedcontexts/catalog_bc/services/pet_app/index.md) | - | Pet | ReservePet | - |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Pet | PetRegistered | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Pet | PetStatusChanged | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Pet | PetDeleted | published-language |
| [PetApp](../boundedcontexts/catalog_bc/services/pet_app/index.md) | - | Pet | MarkPetSold | - |
| [InventoryQuery](../boundedcontexts/inventory_bc/services/inventory_query/index.md) | - | InventoryProjection | InventoryUpdated | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderApproved | published-language |
| [Shipment](../boundedcontexts/fulfilment_bc/aggregates/shipment/index.md) | conformist | Order | OrderApproved | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderDelivered | published-language |
| [InventoryProjection](../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderDeleted | published-language |
| [OrderApp](../boundedcontexts/sales_bc/services/order_app/index.md) | - | Order | DeliverOrder | - |
| [ShipmentApp](../boundedcontexts/fulfilment_bc/services/shipment_app/index.md) | - | OrderApp | ConfirmDelivery | open-host-service |
| [OrderApp](../boundedcontexts/sales_bc/services/order_app/index.md) | - | Shipment | ShipmentDelivered | published-language |
	

