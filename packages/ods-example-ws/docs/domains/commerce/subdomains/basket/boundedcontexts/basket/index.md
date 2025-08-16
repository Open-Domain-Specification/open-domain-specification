

# Basket
Basket service (gRPC/HTTP) to manage user baskets.

![contextmap](./contextmap.svg)

## Aggregates

### [Basket](aggregates/basket/index.md)
Customer basket.


	
## Services

### [BasketService](services/basket_service/index.md)
Basket application service.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [WebApp](../../../../../edge_&_experience/subdomains/web/boundedcontexts/web/services/web_app/index.md) | anti-corruption-layer | BasketService | GetBasket | open-host-service |
| [ShoppingBff](../../../../../edge_&_experience/subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | anti-corruption-layer | BasketService | GetBasket | open-host-service |
| [WebApp](../../../../../edge_&_experience/subdomains/web/boundedcontexts/web/services/web_app/index.md) | anti-corruption-layer | BasketService | AddItem | open-host-service |
| [ShoppingBff](../../../../../edge_&_experience/subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | anti-corruption-layer | BasketService | AddItem | open-host-service |
| [WebApp](../../../../../edge_&_experience/subdomains/web/boundedcontexts/web/services/web_app/index.md) | anti-corruption-layer | BasketService | ClearBasket | open-host-service |
| [ShoppingBff](../../../../../edge_&_experience/subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | anti-corruption-layer | BasketService | ClearBasket | open-host-service |


