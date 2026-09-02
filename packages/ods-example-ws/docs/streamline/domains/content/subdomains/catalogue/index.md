

# Catalogue (supporting)
Titles, seasons, episodes, availability. Supporting: must be excellent and boring

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Catalogue](../../../../boundedcontexts/catalogue/index.md)
What members can see, where and when



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Studio Production | upstream-downstream | Catalogue | published-language | anti-corruption-layer |
| Licensing | upstream-downstream | Catalogue | published-language | anti-corruption-layer |
| Encoding | customer-supplier | Catalogue | open-host-service, published-language | anti-corruption-layer |
| Catalogue | upstream-downstream | Playback | open-host-service | anti-corruption-layer |
| Catalogue | upstream-downstream | Recommendations | published-language | conformist |
| Studio Production | upstream-downstream (implied) | Encoding | published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [PlaybackSession](../../../../boundedcontexts/playback/aggregates/playback_session/index.md) | anti-corruption-layer | CatalogueAPI | GetTitle | open-host-service |
| [Ranker](../../../../boundedcontexts/recommendations/services/ranker/index.md) | conformist | Title | TitlePublished | published-language |
| [Ranker](../../../../boundedcontexts/recommendations/services/ranker/index.md) | conformist | Title | TitleAvailabilityChanged | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | Production | MasterDelivered | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | EncodingJob | EncodingCompleted | published-language |
| [EncodingJob](../../../../boundedcontexts/encoding/aggregates/encoding_job/index.md) | conformist | Production | MasterDelivered | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | LicenseDeal | LicenseWindowOpened | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | LicenseDeal | LicenseWindowExpired | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | EncodingJob | SubmitEncode | open-host-service |
	
	
