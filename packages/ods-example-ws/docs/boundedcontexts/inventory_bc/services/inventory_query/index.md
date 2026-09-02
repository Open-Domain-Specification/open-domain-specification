


# InventoryQuery
Open-host service for /store/inventory

![consumablemap](./consumablemap.svg)

## Provides

### (operation) - GetInventory [open-host-service]
GET /store/inventory → { [status]: count }


## Consumes

### InventoryUpdated [conformist]
undefined
- **Provider**: [InventoryProjection](../../aggregates/inventory_projection/index.md)

	
