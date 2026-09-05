


# ShipmentApp
Fulfilment's application service: the boundary through which Fulfilment reports delivery to Sales

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Rejects with | Raises | Guarded by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ReportDelivery | operation | yes | - | Tell Sales the shipment arrived, by calling the order's ConfirmDelivery | [ShipmentDelivered](../../index.md#schemas) | - | - | - | - |

- **ReportDelivery** also reaches OrderDelivered through the operations it calls, raised where they happen rather than restated here.

## Consumes

### ConfirmDelivery 
POST /store/order/{orderId}/delivered; Fulfilment reports the shipment arrived and the order moves to delivered
- **Provider**: [OrderApp](../../../sales_bc/services/order_app/index.md)
- **Made by**: ReportDelivery

### OrderApproved [conformist]
Order approved (status=approved); Inventory and Fulfilment both react
- **Provider**: [Order](../../../sales_bc/aggregates/order/index.md)
- **Made by**: Plan dispatch on approval

	
