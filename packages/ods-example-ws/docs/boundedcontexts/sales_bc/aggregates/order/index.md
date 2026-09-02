

# Order
Order for a single pet

![contextmap](./relationmap.svg)

![consumablemap](./consumablemap.svg)

## Entities and Value Objects
| Type | Name | Description | Attributes |
| --- | --- | --- | --- |
| Entity (Root) | **Order** | Order root entity | **id**: `int64`, petId: `int64`, quantity: `Quantity`, shipDate: `ShipDate`, status: `OrderStatus`, complete: `CompleteFlag` |
| Value Object | OrderStatus | Where the order is in its lifecycle | value: `'placed' | 'approved' | 'delivered'` |
| Value Object | Quantity | How many of the pet are ordered | value: `int > 0` |
| Value Object | ShipDate | When the order ships | value: `date-time` |
| Value Object | CompleteFlag | Whether the order is complete | value: `boolean` |


## Relationships
| Source | Description | Target | Relation | Cardinality |
| --- | --- | --- | --- | --- |
| [Order](entities/order/index.md) | has-status | Order - OrderStatus | uses | 1 |
| [Order](entities/order/index.md) | has-quantity | Order - Quantity | uses | 1 |
| [Order](entities/order/index.md) | ships-on | Order - ShipDate | uses | 0..1 |
| [Order](entities/order/index.md) | is-complete | Order - CompleteFlag | uses | 1 |
| [Order](entities/order/index.md) | for-pet | Pet - Pet | references | 1 |
| [Pet](../../../catalog_bc/aggregates/pet/entities/pet/index.md) | categorized-as | Pet - Category | uses | 0..1 |
| [Pet](../../../catalog_bc/aggregates/pet/entities/pet/index.md) | tagged-with | Pet - Tag | uses | * |
| [Pet](../../../catalog_bc/aggregates/pet/entities/pet/index.md) | has-photo | Pet - PhotoUrl | uses | 1..* |
| [Pet](../../../catalog_bc/aggregates/pet/entities/pet/index.md) | has-status | Pet - PetStatus | uses | 1 |


## Commands
| Name | Description | Attributes | Raises |
| --- | --- | --- | --- |
| PlaceOrder | Place an order for one pet | petId: `int64`, quantity: `Quantity` | OrderPlaced |
| ApproveOrder | Approve a placed order once the pet is available | **orderId**: `int64` | OrderApproved |
| DeliverOrder | Mark an approved order as delivered | **orderId**: `int64` | OrderDelivered |


## Events
| Name | Description | Attributes |
| --- | --- | --- |
| OrderPlaced | Order created (status=placed) | **orderId**: `int64`, petId: `int64`, quantity: `Quantity` |
| OrderApproved | Order approved (status=approved) | - |
| OrderDelivered | Order delivered (status=delivered) | - |
| OrderDeleted | Order deleted via DELETE /store/order/{orderId} | - |


## Invariants
| Name | Description | Constrains |
| --- | --- | --- |
| QuantityPositive | Quantity must be > 0 | Quantity |
| ApproveOnlyWhenAvailable | Approve only if Pet.status == available | OrderStatus, PetStatus |
| DeliverOnlyWhenApproved | Deliver only from approved | OrderStatus |


## Provides

### (event) - OrderPlaced [published-language]
Order created (status=placed)

### (event) - OrderApproved [published-language]
Order approved (status=approved)

### (event) - OrderDelivered [published-language]
Order delivered (status=delivered)

### (event) - OrderDeleted [published-language]
Order deleted via DELETE /store/order/{orderId}


## Consumes
> No consumptions.
	
