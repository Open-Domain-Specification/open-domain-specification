


# Payment Processing (supporting)
External payment processor integration.

![contextmap](./contextmap.svg)

## Subdomains

### [Payment Processors](subdomains/payment_processors/index.md)
Background processors that integrate with external systems.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [OrderingService](../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | customer-supplier | PaymentService | ProcessPayment | open-host-service |
| [OrderingService](../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | conformist | PaymentService | PaymentSucceeded | published-language |

	
