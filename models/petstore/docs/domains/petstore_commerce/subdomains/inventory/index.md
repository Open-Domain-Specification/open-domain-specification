

# Inventory (supporting)
Aggregated availability by status. Supporting: it must exist, but any correct count will do

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Inventory BC](../../../../boundedcontexts/inventory_bc/index.md)
Projection for /store/inventory (status→count)



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Sales BC | upstream-downstream | Inventory BC | published-language | conformist |
| Catalog BC | shared-kernel | Inventory BC | - | - |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | - | InventoryQuery | InventoryUpdated | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | Pet | PetRegistered | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | Pet | PetDeleted | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | Pet | PetStatusChanged | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | Order | OrderApproved | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | Order | OrderDelivered | published-language |
| [InventoryQuery](../../../../boundedcontexts/inventory_bc/services/inventory_query/index.md) | conformist | Order | OrderDeleted | published-language |
	
	
