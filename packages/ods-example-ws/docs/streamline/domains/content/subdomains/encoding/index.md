

# Encoding (core)
Per-title ladders and renditions. Core: a real quality and cost advantage

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Encoding](../../../../boundedcontexts/encoding/index.md)
Jobs that turn a master into a ladder of renditions



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Studio Production | upstream-downstream | Encoding | published-language | conformist |
| Encoding | customer-supplier | Catalogue | open-host-service, published-language | anti-corruption-layer |
| Encoding | upstream-downstream | Edge Delivery | published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | EncodingJob | EncodingCompleted | published-language |
| [EdgeAppliance](../../../../boundedcontexts/edge_delivery/aggregates/edge_appliance/index.md) | conformist | EncodingJob | EncodingCompleted | published-language |
| [Title](../../../../boundedcontexts/catalogue/aggregates/title/index.md) | anti-corruption-layer | EncodingJob | SubmitEncode | open-host-service |
| [EncodingJob](../../../../boundedcontexts/encoding/aggregates/encoding_job/index.md) | conformist | Production | MasterDelivered | published-language |
	
	
