

# Web
Blazor Server web app for customers.

![contextmap](./contextmap.svg)

## Aggregates
> No aggregates.
	
## Services

### [WebApp](services/web_app/index.md)
Customer-facing web application.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [WebApp](services/web_app/index.md) | customer-supplier | IdentityService | IssueToken | open-host-service |
| [WebApp](services/web_app/index.md) | anti-corruption-layer | CatalogService | GetCatalogItems | open-host-service |
| [WebApp](services/web_app/index.md) | anti-corruption-layer | BasketService | GetBasket | open-host-service |
| [WebApp](services/web_app/index.md) | anti-corruption-layer | BasketService | AddItem | open-host-service |
| [WebApp](services/web_app/index.md) | anti-corruption-layer | BasketService | ClearBasket | open-host-service |
| [WebApp](services/web_app/index.md) | anti-corruption-layer | OrderingService | PlaceOrder | open-host-service |
| [OrderingService](../../../../../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | customer-supplier | PaymentService | ProcessPayment | open-host-service |
| [OrderingService](../../../../../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | conformist | PaymentService | PaymentSucceeded | published-language |


