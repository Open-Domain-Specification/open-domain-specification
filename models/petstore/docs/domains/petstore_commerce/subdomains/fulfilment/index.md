

# Fulfilment (supporting)
Getting a sold pet to its owner. Supporting: needed, but a courier could do it just as well

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Fulfilment BC](../../../../boundedcontexts/fulfilment_bc/index.md)
Plans and tracks the shipment of an approved order until it is delivered



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Sales BC | partnership | Fulfilment BC | - | - |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Shipment](../../../../boundedcontexts/fulfilment_bc/aggregates/shipment/index.md) | conformist | Order | OrderApproved | published-language |
	
	
