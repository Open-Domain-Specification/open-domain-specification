

# Edge
API Gateway + Aggregators (Ocelot-based)

![contextmap](./contextmap.svg)

## Bounded Contexts

### [ApiGateway](boundedcontexts/api_gateway/index.md)
Ocelot + Aggregators (Web & Mobile Shopping)



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [WebShoppingAggregator](boundedcontexts/api_gateway/services/web_shopping_aggregator/index.md) | conformist | BasketService | GetBasket | open-host-service |
| [BasketService](../../../commerce/subdomains/shopping/boundedcontexts/basket/services/basket_service/index.md) | conformist | CatalogService | ProductPriceChanged | published-language |
| [BasketService](../../../commerce/subdomains/shopping/boundedcontexts/basket/services/basket_service/index.md) | conformist | OrderingApp | OrderStarted | published-language |
| [OrderingApp](../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | BasketService | GetBasket | open-host-service |
| [OrderingApp](../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | IdentityService | IssueToken | open-host-service |
| [OrderingApp](../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | MarketingService | ApplyCampaigns | open-host-service |
| [OrderingApp](../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | LocationsService | ResolveLocation | open-host-service |
| [WebShoppingAggregator](boundedcontexts/api_gateway/services/web_shopping_aggregator/index.md) | conformist | CatalogService | SearchProducts | open-host-service |
| [WebShoppingAggregator](boundedcontexts/api_gateway/services/web_shopping_aggregator/index.md) | conformist | OrderingApp | PlaceOrder | open-host-service |
| [MobileShoppingAggregator](boundedcontexts/api_gateway/services/mobile_shopping_aggregator/index.md) | conformist | MarketingService | ApplyCampaigns | open-host-service |
| [MobileShoppingAggregator](boundedcontexts/api_gateway/services/mobile_shopping_aggregator/index.md) | conformist | LocationsService | ResolveLocation | open-host-service |
| [OcelotGateway](boundedcontexts/api_gateway/services/ocelot_gateway/index.md) | conformist | CatalogService | GetProduct | open-host-service |
| [OcelotGateway](boundedcontexts/api_gateway/services/ocelot_gateway/index.md) | conformist | BasketService | GetBasket | open-host-service |
| [OcelotGateway](boundedcontexts/api_gateway/services/ocelot_gateway/index.md) | conformist | OrderingApp | PlaceOrder | open-host-service |
| [OcelotGateway](boundedcontexts/api_gateway/services/ocelot_gateway/index.md) | conformist | IdentityService | IssueToken | open-host-service |
	
	
