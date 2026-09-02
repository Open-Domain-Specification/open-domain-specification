

# Studio Production
Productions, episodes and delivered masters

**Owned by:** Studio Technology Team

## Serves
- [Content / Studio Production](../../domains/content/subdomains/studio_production/index.md) (core)

![contextmap](./contextmap.svg)

## Glossary
| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Master** | The finished file for one film or episode, to the delivery spec | Mezzanine | MasterDelivered |
| **Slate** | Everything commissioned or licensed for a period | - | Production |


## Aggregates

### [Production](aggregates/production/index.md)
One original from greenlight to delivered masters


	
## Services

### [StudioPortal](services/studio_portal/index.md)
The documented delivery portal; external post houses use it too



## Schemas
| Name | Description | Attributes | Used by |
| --- | --- | --- | --- |
| MasterDelivered | The delivery spec: what the catalogue and the encoder learn about a master | **productionId**: `string`, episodeNumber: `int`, mezzanineUri: `string (URI)`, runtimeMinutes: `int` | MasterDelivered, SubmitDelivery |


## Policies
> No policies.

## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Studio Production | upstream-downstream | Catalogue | published-language | anti-corruption-layer |
| Studio Production | upstream-downstream | Encoding | published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [EncodingJob](../encoding/aggregates/encoding_job/index.md) | conformist | Production | MasterDelivered | published-language |
| [Title](../catalogue/aggregates/title/index.md) | anti-corruption-layer | Production | MasterDelivered | published-language |


