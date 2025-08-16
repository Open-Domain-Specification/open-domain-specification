

# Cataloging
Products, brands, types, pricing, stock

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Catalog](boundedcontexts/catalog/index.md)
Catalog.API



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [OcelotGateway](../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/ocelot_gateway/index.md) | conformist | CatalogService | GetProduct | open-host-service |
| [WebShoppingAggregator](../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/web_shopping_aggregator/index.md) | conformist | CatalogService | SearchProducts | open-host-service |
| [BasketService](../shopping/boundedcontexts/basket/services/basket_service/index.md) | conformist | CatalogService | ProductPriceChanged | published-language |
	
	
