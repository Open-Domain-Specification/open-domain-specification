


# AdsAPI
Campaign management for sellers and the sponsored-results read for Search

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| CreateCampaign | operation | no | open-host-service | Start a campaign | - | CampaignLaunched |
| GetSponsoredResults | operation | no | open-host-service | Sponsored slots for a query, merged into organic results by Search | - | - |
| RecordAdClick | operation | no | open-host-service | The results page reports a click on a sponsored slot; this is the moment the seller is charged | [AdClicked](../../index.md#schemas) | AdClicked |


## Consumes

### GetProduct [conformist]
Read one product with its variants
- **Provider**: [CatalogueAPI](../../../catalogue/services/catalogue_api/index.md)

	
