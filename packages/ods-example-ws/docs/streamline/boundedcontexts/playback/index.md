

# Playback
Sessions, manifests and bitrate selection

**Owned by:** Playback Team

## Serves
- [Viewing / Playback](../../domains/viewing/subdomains/playback/index.md) (core)

![contextmap](./contextmap.svg)

## Glossary
| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Session** | One profile watching one title on one device | - | PlaybackSession |
| **Bookmark** | Where playback resumes | Resume point | Bookmark |


## Aggregates

### [PlaybackSession](aggregates/playback_session/index.md)
One profile watching one title on one device


	
## Services

### [AdaptiveBitrateSelector](services/adaptive_bitrate_selector/index.md)
Picks the rung as the network changes; a domain service because it reasons over the whole ladder, not one session



## Schemas
| Name | Description | Attributes | Used by |
| --- | --- | --- | --- |
| StartPlayback | - | profileId: `string`, titleId: `string`, deviceId: `string` | StartPlayback |
| PlaybackStopped | The fact personalisation learns from | **sessionId**: `string`, profileId: `string`, titleId: `string`, watchedSeconds: `int`, completed: `boolean` | PlaybackStopped |


## Policies
> No policies.

## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Catalogue | upstream-downstream | Playback | open-host-service | anti-corruption-layer |
| Playback | upstream-downstream | Recommendations | published-language | anti-corruption-layer |
| Billing & Plans | customer-supplier | Playback | open-host-service | anti-corruption-layer |
| Playback | upstream-downstream | Ads Tier | published-language | anti-corruption-layer |
| Ads Tier | upstream-downstream | Playback | open-host-service | anti-corruption-layer |
| Playback | shared-kernel | Edge Delivery | - | - |
| Playback | partnership | Devices | - | - |
| Encoding | upstream-downstream (implied) | Edge Delivery | published-language | conformist |
| Studio Production | upstream-downstream (implied) | Encoding | published-language | conformist |
| Households & Profiles | upstream-downstream (implied) | Billing & Plans | published-language | conformist |
| Identity | upstream-downstream (implied) | Households & Profiles | published-language | conformist |
| Disc Rental (legacy) | upstream-downstream (implied) | Billing & Plans | published-language | anti-corruption-layer |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [AdBreak](../ads_tier/aggregates/ad_break/index.md) | anti-corruption-layer | PlaybackSession | PlaybackStarted | published-language |
| [TasteProfile](../recommendations/aggregates/taste_profile/index.md) | anti-corruption-layer | PlaybackSession | PlaybackStopped | published-language |
| [TasteProfile](../recommendations/aggregates/taste_profile/index.md) | anti-corruption-layer | PlaybackSession | BookmarkUpdated | - |
| [PlaybackSession](aggregates/playback_session/index.md) | anti-corruption-layer | CatalogueAPI | GetTitle | open-host-service |
| [PlaybackSession](aggregates/playback_session/index.md) | conformist | EdgeAppliance | ResolveEdge | open-host-service |
| [EdgeAppliance](../edge_delivery/aggregates/edge_appliance/index.md) | conformist | EncodingJob | EncodingCompleted | published-language |
| [EncodingJob](../encoding/aggregates/encoding_job/index.md) | conformist | Production | MasterDelivered | published-language |
| [PlaybackSession](aggregates/playback_session/index.md) | conformist | Device | DeviceCertified | published-language |
| [PlaybackSession](aggregates/playback_session/index.md) | anti-corruption-layer | Subscription | GetEntitlement | open-host-service |
| [Subscription](../billing_&_plans/aggregates/subscription/index.md) | conformist | Household | HouseholdCreated | published-language |
| [Household](../households_&_profiles/aggregates/household/index.md) | conformist | Account | AccountCreated | published-language |
| [Subscription](../billing_&_plans/aggregates/subscription/index.md) | anti-corruption-layer | RentalQueue | DiscRentalInvoiced | published-language |
| [PlaybackSession](aggregates/playback_session/index.md) | anti-corruption-layer | AdBreak | ResolveAdBreak | open-host-service |


