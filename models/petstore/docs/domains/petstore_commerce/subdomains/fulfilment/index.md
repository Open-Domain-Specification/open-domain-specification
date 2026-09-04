

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
| Catalog BC | upstream-downstream (implied) | Sales BC | open-host-service | anti-corruption-layer |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [ShipmentApp](../../../../boundedcontexts/fulfilment_bc/services/shipment_app/index.md) | - | OrderApp | ConfirmDelivery | open-host-service |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | - | Order | DeliverOrder | - |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | GetPetSummary | open-host-service |
| [PetApp](../../../../boundedcontexts/catalog_bc/services/pet_app/index.md) | - | Pet | ReservePet | - |
| [PetApp](../../../../boundedcontexts/catalog_bc/services/pet_app/index.md) | - | Pet | MarkPetSold | - |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | ReservePetForOrder | open-host-service |
| [OrderApp](../../../../boundedcontexts/sales_bc/services/order_app/index.md) | anti-corruption-layer | PetApp | MarkPetSoldForOrder | open-host-service |
| [Shipment](../../../../boundedcontexts/fulfilment_bc/aggregates/shipment/index.md) | conformist | Order | OrderApproved | published-language |
	
	
