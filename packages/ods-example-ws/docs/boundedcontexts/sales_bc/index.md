

# Sales BC
Owns Order aggregate & order-facing operations

**Owned by:** Orders Team

## Serves
- [Petstore Commerce / Sales](../../domains/petstore_commerce/subdomains/sales/index.md) (core)

![contextmap](./contextmap.svg)

## Aggregates

### [Order](aggregates/order/index.md)
Order for a single pet


	
## Services

### [OrderApp](services/order_app/index.md)
Open-host service for /store/order endpoints



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Catalog BC | customer-supplier | Sales BC | open-host-service | anti-corruption-layer |
| Identity BC | separate-ways | Sales BC | - | - |
| Sales BC | upstream-downstream (implied) | Inventory BC | published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [OrderApp](services/order_app/index.md) | anti-corruption-layer | PetApp | GetPetSummary | open-host-service |
| [InventoryProjection](../inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderApproved | published-language |
| [InventoryProjection](../inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderDelivered | published-language |
| [InventoryProjection](../inventory_bc/aggregates/inventory_projection/index.md) | conformist | Order | OrderDeleted | published-language |


