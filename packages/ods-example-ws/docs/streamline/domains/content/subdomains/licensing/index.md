

# Licensing (core)
Third-party titles by territory and window. Core: exclusive windows are fought over

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Licensing](../../../../boundedcontexts/licensing/index.md)
Deals with licensors and the windows inside them



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Licensing | upstream-downstream | Catalogue | published-language | anti-corruption-layer |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | LicenseDeal | LicenseWindowOpened | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | LicenseDeal | LicenseWindowExpired | published-language |
	
	
