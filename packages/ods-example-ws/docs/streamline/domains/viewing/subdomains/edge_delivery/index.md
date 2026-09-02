

# Edge Delivery (core)
Caches inside ISPs. Core: why a stream starts in under a second

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Edge Delivery](../../../../boundedcontexts/edge_delivery/index.md)
Appliances in ISPs and what they cache



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Encoding | upstream-downstream | Edge Delivery | published-language | conformist |
| Playback | shared-kernel | Edge Delivery | - | - |
| Studio Production | upstream-downstream (implied) | Encoding | published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [PlaybackSession](../../../../boundedcontexts/playback/aggregates/playback_session/index.md) | conformist | EdgeAppliance | ResolveEdge | open-host-service |
| [EdgeAppliance](../../../../boundedcontexts/edge_delivery/aggregates/edge_appliance/index.md) | conformist | EncodingJob | EncodingCompleted | published-language |
| [EncodingJob](../../../../boundedcontexts/encoding/aggregates/encoding_job/index.md) | conformist | Production | MasterDelivered | published-language |
	
	
