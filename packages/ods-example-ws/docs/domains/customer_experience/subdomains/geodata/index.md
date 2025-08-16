

# Geodata
Locations and related data

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Locations](boundedcontexts/locations/index.md)
Locations.API



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [MobileShoppingAggregator](../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/mobile_shopping_aggregator/index.md) | conformist | LocationsService | ResolveLocation | open-host-service |
| [OrderingApp](../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | LocationsService | ResolveLocation | open-host-service |
	
	
