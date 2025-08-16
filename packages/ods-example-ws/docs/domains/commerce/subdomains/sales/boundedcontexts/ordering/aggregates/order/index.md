

# Order
Order lifecycle

![contextmap](./relationmap.svg)

![consumablemap](./consumablemap.svg)

## Entities and Value Objects
| Type | Name | Description |
| --- | --- | --- |
| Entity (Root) | **Order** | Order header (root) |
| Entity | OrderItem | Committed product line |
| Value Object | Money | Totals |
| Value Object | Address | Shipping address value object |
| Value Object | OrderStatus | Submitted/Paid/Shipped/Cancelled, etc. |


## Relationships
| Source | Description | Target | Relation |
| --- | --- | --- | --- |
| [Order](entities/order/index.md) | totals | Order - Money | uses |
| [Order](entities/order/index.md) | ships to | Order - Address | uses |
| [Order](entities/order/index.md) | status | Order - OrderStatus | uses |
| [PaymentMethod](../buyer/entities/payment_method/index.md) | details | Buyer - Card | uses |


## Invariants
| Name | Description |
| --- | --- |
| AtLeastOneItem | Order must have >= 1 item |
| TotalsNonNegative | Totals >= 0 |


## Provides
> No consumables.

## Consumes
> No consumptions.
	
