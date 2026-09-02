


# OrderApp
Open-host service for /store/order endpoints

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| PlaceOrder | operation | no | open-host-service | POST /store/order | [PlaceOrder](../../index.md#schemas) | OrderPlaced |
| GetOrderById | operation | no | open-host-service | GET /store/order/{orderId} | [OrderId](../../index.md#schemas) | - |
| DeleteOrder | operation | no | open-host-service | DELETE /store/order/{orderId} | [OrderId](../../index.md#schemas) | OrderDeleted |


## Consumes

### GetPetSummary [anti-corruption-layer]
Slim {id,name,status} read offered to other contexts, so Sales can check availability without coupling to the full Pet
- **Provider**: [PetApp](../../../catalog_bc/services/pet_app/index.md)

	
