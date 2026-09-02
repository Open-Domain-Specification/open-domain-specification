

# Inventory BC
Projection for /store/inventory (status→count)

**Owned by:** Pet Shop Team

## Serves
- [Petstore Commerce / Inventory](../../domains/petstore_commerce/subdomains/inventory/index.md) (supporting)
- [Petstore Commerce / Catalog](../../domains/petstore_commerce/subdomains/catalog/index.md) (core)

![contextmap](./contextmap.svg)

## Aggregates

### [InventoryProjection](aggregates/inventory_projection/index.md)
Materialized view: { available: number, pending: number, sold: number }


	
## Services

### [InventoryQuery](services/inventory_query/index.md)
Open-host service for /store/inventory



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Catalog BC | upstream-downstream (implied) | Inventory BC | published-language | conformist |
| Sales BC | upstream-downstream (implied) | Inventory BC | published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [InventoryQuery](services/inventory_query/index.md) | conformist | InventoryProjection | InventoryUpdated | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Pet | PetRegistered | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Pet | PetDeleted | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Pet | PetStatusChanged | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Order | OrderApproved | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Order | OrderDelivered | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Order | OrderDeleted | published-language |


