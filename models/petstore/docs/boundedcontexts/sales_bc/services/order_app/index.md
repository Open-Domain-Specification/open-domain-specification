


# OrderApp
Open-host service for /store/order endpoints

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Raises |
| --- | --- | --- | --- | --- | --- | --- | --- |
| PlaceOrder | operation | no | open-host-service | POST /store/order | [PlaceOrder](../../index.md#schemas) | - | OrderPlaced |
| GetOrderById | operation | no | open-host-service | GET /store/order/{orderId} | [OrderId](../../index.md#schemas) | - | - |
| DeleteOrder | operation | no | open-host-service | DELETE /store/order/{orderId} | [OrderId](../../index.md#schemas) | - | OrderDeleted |


## Consumes

### GetPetSummary [anti-corruption-layer]
GET /pets/{id}/summary; asked with a PetId, answers with a PetSummary, so Sales can check availability without coupling to the full Pet
- **Provider**: [PetApp](../../../catalog_bc/services/pet_app/index.md)

### ReservePet [anti-corruption-layer]
available → pending: the pet is held for an approved order; issued by Sales on approval
- **Provider**: [Pet](../../../catalog_bc/aggregates/pet/index.md)

### MarkPetSold [anti-corruption-layer]
pending → sold: the pet has gone to its owner; issued by Sales on delivery
- **Provider**: [Pet](../../../catalog_bc/aggregates/pet/index.md)

	
