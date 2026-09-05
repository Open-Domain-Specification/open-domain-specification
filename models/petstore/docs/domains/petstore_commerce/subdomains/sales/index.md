

# Sales (core)
Orders and order lifecycle. Core because approving the right order at the right time is the store's promise

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Sales BC](../../../../boundedcontexts/sales_bc/index.md)
Owns the Order aggregate and the order-facing operations



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Catalog BC | customer-supplier | Sales BC | open-host-service | anti-corruption-layer |
| Sales BC | upstream-downstream | Inventory BC | published-language | conformist |
| Sales BC | partnership | Fulfilment BC | - | - |
| Identity BC | separate-ways | Sales BC | - | - |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [ShipmentApp](../../../../boundedcontexts/fulfilment_bc/services/shipment_app/index.md) | - | OrderApp | ConfirmDelivery | open-host-service |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | - | Order | DeliverOrder | - |
| [ShipmentApp](../../../../boundedcontexts/fulfilment_bc/services/shipment_app/index.md) | conformist | Order | OrderApproved | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | Order | OrderApproved | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | Order | OrderDelivered | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | Order | OrderDeleted | published-language |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | ReservePetForOrder | open-host-service |
| [PetApp](../../../../boundedcontexts/catalog_bc/services/pet_app/index.md) | - | Pet | ReservePet | - |
| [PetApp](../../../../boundedcontexts/catalog_bc/services/pet_app/index.md) | - | Pet | MarkPetSold | - |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | MarkPetSoldForOrder | open-host-service |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | GetPetSummary | open-host-service |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | Pet | PetStatusChanged | published-language |
	
	
