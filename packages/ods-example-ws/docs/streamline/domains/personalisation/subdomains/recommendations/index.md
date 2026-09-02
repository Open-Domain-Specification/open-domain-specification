

# Recommendations (core)
Ranking rows per profile. Core: the strongest lever on retention

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Recommendations](../../../../boundedcontexts/recommendations/index.md)
Taste profiles and the ranker behind the home screen



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Catalogue | upstream-downstream | Recommendations | published-language | conformist |
| Playback | upstream-downstream | Recommendations | published-language | anti-corruption-layer |
| Households & Profiles | upstream-downstream | Recommendations | published-language | conformist |
| Ads Tier | separate-ways | Recommendations | - | - |
| Studio Production | upstream-downstream (implied) | Catalogue | published-language | anti-corruption-layer |
| Encoding | upstream-downstream (implied) | Catalogue | published-language, open-host-service | anti-corruption-layer |
| Studio Production | upstream-downstream (implied) | Encoding | published-language | conformist |
| Licensing | upstream-downstream (implied) | Catalogue | published-language | anti-corruption-layer |
| Catalogue | upstream-downstream (implied) | Playback | open-host-service | anti-corruption-layer |
| Edge Delivery | upstream-downstream (implied) | Playback | open-host-service | conformist |
| Encoding | upstream-downstream (implied) | Edge Delivery | published-language | conformist |
| Devices | upstream-downstream (implied) | Playback | published-language | conformist |
| Billing & Plans | upstream-downstream (implied) | Playback | open-host-service | anti-corruption-layer |
| Households & Profiles | upstream-downstream (implied) | Billing & Plans | published-language | conformist |
| Identity | upstream-downstream (implied) | Households & Profiles | published-language | conformist |
| Disc Rental (legacy) | upstream-downstream (implied) | Billing & Plans | published-language | anti-corruption-layer |
| Ads Tier | upstream-downstream (implied) | Playback | open-host-service | anti-corruption-layer |
| Playback | upstream-downstream (implied) | Ads Tier | published-language | anti-corruption-layer |
| Billing & Plans | upstream-downstream (implied) | Ads Tier | open-host-service | anti-corruption-layer |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Ranker](../../../../boundedcontexts/recommendations/services/ranker/index.md) | conformist | Title | TitlePublished | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | Production | MasterDelivered | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | EncodingJob | EncodingCompleted | published-language |
| [EncodingJob](../../../../boundedcontexts/encoding/aggregates/encoding_job/index.md) | conformist | Production | MasterDelivered | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | LicenseDeal | LicenseWindowOpened | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | LicenseDeal | LicenseWindowExpired | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | EncodingJob | SubmitEncode | open-host-service |
| [Ranker](../../../../boundedcontexts/recommendations/services/ranker/index.md) | conformist | Title | TitleAvailabilityChanged | published-language |
| [TasteProfile](../../../../boundedcontexts/recommendations/aggregates/taste_profile/index.md) | anti-corruption-layer | PlaybackSession | PlaybackStopped | published-language |
| [PlaybackSession](../../../../boundedcontexts/playback/aggregates/playback_session/index.md) | anti-corruption-layer | CatalogueAPI | GetTitle | open-host-service |
| [PlaybackSession](../../../../boundedcontexts/playback/aggregates/playback_session/index.md) | conformist | EdgeAppliance | ResolveEdge | open-host-service |
| [EdgeAppliance](../../../../boundedcontexts/edge_delivery/aggregates/edge_appliance/index.md) | conformist | EncodingJob | EncodingCompleted | published-language |
| [PlaybackSession](../../../../boundedcontexts/playback/aggregates/playback_session/index.md) | conformist | Device | DeviceCertified | published-language |
| [PlaybackSession](../../../../boundedcontexts/playback/aggregates/playback_session/index.md) | anti-corruption-layer | Subscription | GetEntitlement | open-host-service |
| [Subscription](../../../../boundedcontexts/billing_&_plans/aggregates/subscription/index.md) | conformist | Household | HouseholdCreated | published-language |
| [Household](../../../../boundedcontexts/households_&_profiles/aggregates/household/index.md) | conformist | Account | AccountCreated | published-language |
| [Subscription](../../../../boundedcontexts/billing_&_plans/aggregates/subscription/index.md) | anti-corruption-layer | RentalQueue | DiscRentalInvoiced | published-language |
| [PlaybackSession](../../../../boundedcontexts/playback/aggregates/playback_session/index.md) | anti-corruption-layer | AdBreak | ResolveAdBreak | open-host-service |
| [AdBreak](../../../../boundedcontexts/ads_tier/aggregates/ad_break/index.md) | anti-corruption-layer | PlaybackSession | PlaybackStarted | published-language |
| [AdBreak](../../../../boundedcontexts/ads_tier/aggregates/ad_break/index.md) | anti-corruption-layer | Subscription | GetEntitlement | open-host-service |
| [TasteProfile](../../../../boundedcontexts/recommendations/aggregates/taste_profile/index.md) | anti-corruption-layer | PlaybackSession | BookmarkUpdated | - |
| [TasteProfile](../../../../boundedcontexts/recommendations/aggregates/taste_profile/index.md) | conformist | Household | ProfileCreated | published-language |
	
	
