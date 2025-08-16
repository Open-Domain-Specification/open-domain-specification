

# Experience BFF
BFF that aggregates catalog/basket/ordering.

![contextmap](./contextmap.svg)

## Aggregates
> No aggregates.
	
## Services

### [ShoppingBff](services/shopping_bff/index.md)
Aggregation endpoints for shopping journeys.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [ShoppingBff](services/shopping_bff/index.md) | customer-supplier | IdentityService | IssueToken | open-host-service |
| [ShoppingBff](services/shopping_bff/index.md) | anti-corruption-layer | CatalogService | GetCatalogItems | open-host-service |
| [ShoppingBff](services/shopping_bff/index.md) | anti-corruption-layer | BasketService | GetBasket | open-host-service |
| [ShoppingBff](services/shopping_bff/index.md) | anti-corruption-layer | BasketService | AddItem | open-host-service |
| [ShoppingBff](services/shopping_bff/index.md) | anti-corruption-layer | BasketService | ClearBasket | open-host-service |
| [ShoppingBff](services/shopping_bff/index.md) | anti-corruption-layer | OrderingService | PlaceOrder | open-host-service |
| [OrderingService](../../../../../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | customer-supplier | PaymentService | ProcessPayment | open-host-service |
| [OrderingService](../../../../../commerce/subdomains/ordering/boundedcontexts/ordering/services/ordering_service/index.md) | conformist | PaymentService | PaymentSucceeded | published-language |


