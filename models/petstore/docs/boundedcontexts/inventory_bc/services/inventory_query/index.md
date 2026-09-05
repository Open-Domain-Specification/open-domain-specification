


# InventoryQuery
Open-host service for /store/inventory: a projection is a service that provides a query (decision 15), not an aggregate with an invented root

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Raises | Guarded by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| GetInventory | operation | no | open-host-service | GET /store/inventory; takes nothing, answers with the counts | - | [InventoryCounts](../../index.md#schemas) | - | - |
| InventoryUpdated | event | no | published-language | Inventory counts changed | [InventoryUpdatedPayload](../../index.md#schemas) | - | - | - |
| RecountInventory | operation | yes | - | Recompute the status→count map from catalog and sales facts | - | - | InventoryUpdated | - |


## Consumes

### PetRegistered [conformist]
A new pet was registered
- **Provider**: [Pet](../../../catalog_bc/aggregates/pet/index.md)

### PetDeleted [conformist]
Pet removed from catalog
- **Provider**: [Pet](../../../catalog_bc/aggregates/pet/index.md)

### PetStatusChanged [conformist]
Pet status changed (available|pending|sold)
- **Provider**: [Pet](../../../catalog_bc/aggregates/pet/index.md)

### OrderApproved [conformist]
Order approved (status=approved); Inventory and Fulfilment both react
- **Provider**: [Order](../../../sales_bc/aggregates/order/index.md)

### OrderDelivered [conformist]
Order delivered (status=delivered)
- **Provider**: [Order](../../../sales_bc/aggregates/order/index.md)

### OrderDeleted [conformist]
Order deleted via DELETE /store/order/{orderId}
- **Provider**: [Order](../../../sales_bc/aggregates/order/index.md)

### InventoryUpdated 
Inventory counts changed
- **Provider**: [InventoryQuery](./index.md)

	
