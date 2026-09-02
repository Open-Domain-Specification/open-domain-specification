

# Shipment
The journey of one approved order to its owner. Attempts live inside it because they mean nothing without the shipment

![contextmap](./relationmap.svg)

![consumablemap](./consumablemap.svg)

## Entities and Value Objects
| Type | Name | Description | Attributes |
| --- | --- | --- | --- |
| Entity (Root) | **Shipment** | One consignment for one order | **id**: `int64`, orderId: `int64`, status: `ShipmentStatus` |
| Entity | DeliveryAttempt | A dated try at handing over the pet; an entity because attempts are counted and ordered, a child because it never exists without its shipment | attemptedAt: `date-time`, succeeded: `boolean` |
| Value Object | TrackingNumber | Carrier reference; a value because two shipments never share one | value: `string` |
| Value Object | ShipmentStatus | planned, in-transit or delivered | value: `'planned' | 'in-transit' | 'delivered'` |


## Relationships
| Source | Description | Target | Relation | Cardinality |
| --- | --- | --- | --- | --- |
| [Shipment](entities/shipment/index.md) | attempted-by | Shipment - DeliveryAttempt | includes | * |
| [Shipment](entities/shipment/index.md) | tracked-as | Shipment - TrackingNumber | uses | 1 |
| [Shipment](entities/shipment/index.md) | has-status | Shipment - ShipmentStatus | uses | 1 |
| [Shipment](entities/shipment/index.md) | fulfils | Order - Order | references | 1 |
| [Order](../../../sales_bc/aggregates/order/entities/order/index.md) | has-status | Order - OrderStatus | uses | 1 |
| [Order](../../../sales_bc/aggregates/order/entities/order/index.md) | has-quantity | Order - Quantity | uses | 1 |
| [Order](../../../sales_bc/aggregates/order/entities/order/index.md) | ships-on | Order - ShipDate | uses | 0..1 |
| [Order](../../../sales_bc/aggregates/order/entities/order/index.md) | for-pet | Pet - Pet | references | 1 |
| [Pet](../../../catalog_bc/aggregates/pet/entities/pet/index.md) | categorized-as | Pet - Category | uses | 0..1 |
| [Pet](../../../catalog_bc/aggregates/pet/entities/pet/index.md) | tagged-with | Pet - Tag | uses | * |
| [Pet](../../../catalog_bc/aggregates/pet/entities/pet/index.md) | has-photo | Pet - PhotoUrl | uses | 1..* |
| [Pet](../../../catalog_bc/aggregates/pet/entities/pet/index.md) | has-status | Pet - PetStatus | uses | 1 |


## Invariants
| Name | Description | Constrains |
| --- | --- | --- |
| DeliveredOnlyByAttempt | A shipment becomes delivered only through a successful delivery attempt, so the audit trail is never empty | Shipment |


## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| ShipmentPlanned | event | yes | - | A ship date was chosen for an approved order | - | - |
| ShipmentDelivered | event | no | published-language | The pet reached its owner | [ShipmentDelivered](../../index.md#schemas) | - |
| RecordDeliveryAttempt | operation | yes | - | Log a delivery attempt; a successful one delivers the shipment | - | ShipmentDelivered |


## Consumes

### OrderApproved [conformist]
Order approved (status=approved); Inventory and Fulfilment both react
- **Provider**: [Order](../../../sales_bc/aggregates/order/index.md)

	
