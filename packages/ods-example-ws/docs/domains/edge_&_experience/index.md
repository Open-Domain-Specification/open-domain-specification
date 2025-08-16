


# Edge & Experience (supporting)
Customer-facing web app and mobile BFF.

![contextmap](./contextmap.svg)

## Subdomains

### [Web](subdomains/web/index.md)
Blazor web UI for customers.


### [Mobile](subdomains/mobile/index.md)
Mobile BFF/aggregator for shopping flows.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [WebApp](subdomains/web/boundedcontexts/web/services/web_app/index.md) | customer-supplier | IdentityService | IssueToken | open-host-service |
| [WebApp](subdomains/web/boundedcontexts/web/services/web_app/index.md) | anti-corruption-layer | CatalogService | GetCatalogItems | open-host-service |
| [WebApp](subdomains/web/boundedcontexts/web/services/web_app/index.md) | anti-corruption-layer | BasketService | GetBasket | open-host-service |
| [WebApp](subdomains/web/boundedcontexts/web/services/web_app/index.md) | anti-corruption-layer | BasketService | AddItem | open-host-service |
| [WebApp](subdomains/web/boundedcontexts/web/services/web_app/index.md) | anti-corruption-layer | BasketService | ClearBasket | open-host-service |
| [WebApp](subdomains/web/boundedcontexts/web/services/web_app/index.md) | anti-corruption-layer | OrderingService | PlaceOrder | open-host-service |
| [OrderingService](../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | customer-supplier | PaymentService | ProcessPayment | open-host-service |
| [OrderingService](../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | conformist | PaymentService | PaymentSucceeded | published-language |
| [ShoppingBff](subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | customer-supplier | IdentityService | IssueToken | open-host-service |
| [ShoppingBff](subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | anti-corruption-layer | CatalogService | GetCatalogItems | open-host-service |
| [ShoppingBff](subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | anti-corruption-layer | BasketService | GetBasket | open-host-service |
| [ShoppingBff](subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | anti-corruption-layer | BasketService | AddItem | open-host-service |
| [ShoppingBff](subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | anti-corruption-layer | BasketService | ClearBasket | open-host-service |
| [ShoppingBff](subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | anti-corruption-layer | OrderingService | PlaceOrder | open-host-service |

	
