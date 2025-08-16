

# Catalog
Catalog.API

![contextmap](./contextmap.svg)

## Aggregates

### [Product](aggregates/product/index.md)
Sellable item with price & stock


	
## Services

### [CatalogService](services/catalog_service/index.md)
Queries, pricing updates, stock



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [OcelotGateway](../../../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/ocelot_gateway/index.md) | conformist | CatalogService | GetProduct | open-host-service |
| [WebShoppingAggregator](../../../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/web_shopping_aggregator/index.md) | conformist | CatalogService | SearchProducts | open-host-service |
| [BasketService](../../../shopping/boundedcontexts/basket/services/basket_service/index.md) | conformist | CatalogService | ProductPriceChanged | published-language |


