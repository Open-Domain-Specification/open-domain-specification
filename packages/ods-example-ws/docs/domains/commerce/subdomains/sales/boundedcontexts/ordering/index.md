

# Ordering
Ordering.API (rich DDD + domain events)

![contextmap](./contextmap.svg)

## Aggregates

### [Order](aggregates/order/index.md)
Order lifecycle


### [Buyer](aggregates/buyer/index.md)
Purchaser + payment methods


	
## Services

### [OrderingApp](services/ordering_app/index.md)
Start/Place orders


### [OrderingWorkflow](services/ordering_workflow/index.md)
Policies, coordination



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [WebShoppingAggregator](../../../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/web_shopping_aggregator/index.md) | conformist | OrderingApp | PlaceOrder | open-host-service |
| [OcelotGateway](../../../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/ocelot_gateway/index.md) | conformist | OrderingApp | PlaceOrder | open-host-service |
| [BasketService](../../../shopping/boundedcontexts/basket/services/basket_service/index.md) | conformist | OrderingApp | OrderStarted | published-language |
| [PaymentService](../../../payments/boundedcontexts/payment/services/payment_service/index.md) | conformist | OrderingApp | OrderStarted | published-language |
| [OrderingApp](services/ordering_app/index.md) | anti-corruption-layer | BasketService | GetBasket | open-host-service |
| [BasketService](../../../shopping/boundedcontexts/basket/services/basket_service/index.md) | conformist | CatalogService | ProductPriceChanged | published-language |
| [OrderingApp](services/ordering_app/index.md) | anti-corruption-layer | IdentityService | IssueToken | open-host-service |
| [OrderingApp](services/ordering_app/index.md) | anti-corruption-layer | MarketingService | ApplyCampaigns | open-host-service |
| [OrderingApp](services/ordering_app/index.md) | anti-corruption-layer | LocationsService | ResolveLocation | open-host-service |
| [WebhooksService](../../../../../customer_experience/subdomains/webhooks/boundedcontexts/webhooks/services/webhooks_service/index.md) | conformist | OrderingWorkflow | OrderStatusChanged | published-language |
| [SignalRHub](../../../../../customer_experience/subdomains/realtime/boundedcontexts/ordering_signal_rhub/services/signal_rhub/index.md) | conformist | OrderingWorkflow | OrderStatusChanged | published-language |
| [OrderingWorkflow](services/ordering_workflow/index.md) | customer-supplier | PaymentService | AuthorizePayment | open-host-service |
| [OrderingWorkflow](services/ordering_workflow/index.md) | customer-supplier | PaymentService | CapturePayment | open-host-service |
| [OrderingWorkflow](services/ordering_workflow/index.md) | conformist | PaymentService | PaymentStatusChanged | published-language |


