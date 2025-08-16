

# PaymentProcessor
Simulated external payment processor.

![contextmap](./contextmap.svg)

## Aggregates
> No aggregates.
	
## Services

### [PaymentService](services/payment_service/index.md)
Takes payments and emits status changes.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [OrderingService](../../../../../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | customer-supplier | PaymentService | ProcessPayment | open-host-service |
| [OrderingService](../../../../../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | conformist | PaymentService | PaymentSucceeded | published-language |


