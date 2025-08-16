

# Processors
Long-running or out-of-process work that simulates real external integrations. In this sample, it models a payment processor that authorizes or rejects payments and publishes outcomes.

![contextmap](./contextmap.svg)

## Bounded Contexts

### [PaymentProcessor](boundedcontexts/payment_processor/index.md)
Simulated external payment provider. In a real system this would be a third-party gateway. Here it processes requests and publishes results for Ordering to react to.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [OrderingService](../../../commerce/subdomains/ordering/boundedcontexts/ordering.api/services/ordering_service/index.md) | customer-supplier | PaymentService | ProcessPayment | open-host-service |
| [OrderingService](../../../commerce/subdomains/ordering/boundedcontexts/ordering.api/services/ordering_service/index.md) | conformist | PaymentService | PaymentSucceeded | published-language |
	
	
