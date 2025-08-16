

# Promotions
Campaigns, discounts

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Marketing](boundedcontexts/marketing/index.md)
Marketing.API



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [MobileShoppingAggregator](../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/mobile_shopping_aggregator/index.md) | conformist | MarketingService | ApplyCampaigns | open-host-service |
| [OrderingApp](../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | MarketingService | ApplyCampaigns | open-host-service |
	
	
