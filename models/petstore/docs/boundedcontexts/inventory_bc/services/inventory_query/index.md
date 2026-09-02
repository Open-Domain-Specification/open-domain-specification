


# InventoryQuery
Open-host service for /store/inventory

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| GetInventory | operation | no | open-host-service | GET /store/inventory → { [status]: count } | - | - |


## Consumes

### InventoryUpdated 
Inventory counts changed
- **Provider**: [InventoryProjection](../../aggregates/inventory_projection/index.md)

	
