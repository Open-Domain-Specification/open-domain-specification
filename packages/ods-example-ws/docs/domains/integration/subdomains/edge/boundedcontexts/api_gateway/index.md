

# ApiGateway
Ocelot + Aggregators (Web & Mobile Shopping)

![contextmap](./contextmap.svg)

## Aggregates
> No aggregates.
	
## Services

### [WebShoppingAggregator](services/web_shopping_aggregator/index.md)
Aggregates Orders/Basket/Catalog


### [MobileShoppingAggregator](services/mobile_shopping_aggregator/index.md)
Aggregates Marketing/Locations


### [OcelotGateway](services/ocelot_gateway/index.md)
Edge routing (conforming to downstream contracts)



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [WebShoppingAggregator](services/web_shopping_aggregator/index.md) | conformist | BasketService | GetBasket | open-host-service |
| [BasketService](../../../../../commerce/subdomains/shopping/boundedcontexts/basket/services/basket_service/index.md) | conformist | CatalogService | ProductPriceChanged | published-language |
| [BasketService](../../../../../commerce/subdomains/shopping/boundedcontexts/basket/services/basket_service/index.md) | conformist | OrderingApp | OrderStarted | published-language |
| [OrderingApp](../../../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | BasketService | GetBasket | open-host-service |
| [OrderingApp](../../../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | IdentityService | IssueToken | open-host-service |
| [OrderingApp](../../../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | MarketingService | ApplyCampaigns | open-host-service |
| [OrderingApp](../../../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | LocationsService | ResolveLocation | open-host-service |
| [WebShoppingAggregator](services/web_shopping_aggregator/index.md) | conformist | CatalogService | SearchProducts | open-host-service |
| [WebShoppingAggregator](services/web_shopping_aggregator/index.md) | conformist | OrderingApp | PlaceOrder | open-host-service |
| [MobileShoppingAggregator](services/mobile_shopping_aggregator/index.md) | conformist | MarketingService | ApplyCampaigns | open-host-service |
| [MobileShoppingAggregator](services/mobile_shopping_aggregator/index.md) | conformist | LocationsService | ResolveLocation | open-host-service |
| [OcelotGateway](services/ocelot_gateway/index.md) | conformist | CatalogService | GetProduct | open-host-service |
| [OcelotGateway](services/ocelot_gateway/index.md) | conformist | BasketService | GetBasket | open-host-service |
| [OcelotGateway](services/ocelot_gateway/index.md) | conformist | OrderingApp | PlaceOrder | open-host-service |
| [OcelotGateway](services/ocelot_gateway/index.md) | conformist | IdentityService | IssueToken | open-host-service |


