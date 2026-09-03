

# Inventory BC
Projection for /store/inventory (status→count)

**Owned by:** Pet Shop Team

## Serves
- [Petstore Commerce / Inventory](../../domains/petstore_commerce/subdomains/inventory/index.md) (supporting)
- [Petstore Commerce / Catalog](../../domains/petstore_commerce/subdomains/catalog/index.md) (core)

![contextmap](./contextmap.svg)

## Glossary
| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Availability** | How many pets are available, pending and sold right now; a projection, not a source of truth | Stock | InventoryProjection |


## Aggregates

### [InventoryProjection](aggregates/inventory_projection/index.md)
Materialized view: { available: number, pending: number, sold: number }. An aggregate because the counts are rebuilt as one unit


	
## Services

### [InventoryQuery](services/inventory_query/index.md)
Open-host service for /store/inventory



## Schemas
> No schemas.

## Policies
![flowmap](./flowmap.svg)

| Name | Description | On | Then |
| --- | --- | --- | --- |
| Recount on stock change | Keep the availability projection current | PetRegistered, PetDeleted, PetStatusChanged, OrderApproved, OrderDelivered, OrderDeleted | RecountInventory |


## Context Relationships
### Depends on
| With | Description | Type | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Sales BC | The projection counts orders as Sales reports them | upstream-downstream | published-language | conformist |

### Works alongside
| With | Description | Type | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Catalog BC | PetStatus and its values are one shared definition | shared-kernel | - | - |

- `conformist` — **Conformist** (CF). Downstream adopts the upstream domain model without translation.
- `published-language` — **Published Language** (PL). A well-documented shared interchange format.
- `upstream-downstream` — **Upstream/Downstream** (U/D). One context depends on another; the upstream does not plan around the downstream.
- `shared-kernel` — **Shared Kernel** (SK). A shared subset of domain model and code, co-owned by both teams.

## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [InventoryQuery](services/inventory_query/index.md) | - | InventoryProjection | InventoryUpdated | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Pet | PetRegistered | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Pet | PetDeleted | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Pet | PetStatusChanged | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Order | OrderApproved | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Order | OrderDelivered | published-language |
| [InventoryProjection](aggregates/inventory_projection/index.md) | conformist | Order | OrderDeleted | published-language |


