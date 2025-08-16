

# Marketing
Marketing.API

![contextmap](./contextmap.svg)

## Aggregates
> No aggregates.
	
## Services

### [MarketingService](services/marketing_service/index.md)
Apply campaigns/discounts



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [MobileShoppingAggregator](../../../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/mobile_shopping_aggregator/index.md) | conformist | MarketingService | ApplyCampaigns | open-host-service |
| [OrderingApp](../../../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | MarketingService | ApplyCampaigns | open-host-service |


