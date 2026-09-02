

# Catalog (core)
Pet definitions, attributes, lifecycle

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Catalog BC](../../../../boundedcontexts/catalog_bc/index.md)
Owns Pet aggregate & pet-facing operations


### [Inventory BC](../../../../boundedcontexts/inventory_bc/index.md)
Projection for /store/inventory (status→count)



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | GetPetSummary | open-host-service |
| [InventoryProjection](../../../../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Pet | PetRegistered | published-language |
| [InventoryProjection](../../../../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Pet | PetStatusChanged | published-language |
| [InventoryProjection](../../../../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Pet | PetDeleted | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | InventoryProjection | InventoryUpdated | published-language |
| [InventoryProjection](../../../../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderApproved | published-language |
| [InventoryProjection](../../../../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderDelivered | published-language |
| [InventoryProjection](../../../../boundedcontexts/inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderDeleted | published-language |
	
	
