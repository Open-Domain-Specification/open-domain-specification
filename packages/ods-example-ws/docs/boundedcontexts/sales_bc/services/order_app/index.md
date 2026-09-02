


# OrderApp
Open-host service for /store/order endpoints

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| PlaceOrder | operation | no | open-host-service | POST /store/order | [PlaceOrder](../../index.md#schemas) | OrderPlaced |
| GetOrderById | operation | no | open-host-service | GET /store/order/{orderId} | - | - |
| DeleteOrder | operation | no | open-host-service | DELETE /store/order/{orderId} | - | OrderDeleted |


## Consumes

### GetPetSummary [anti-corruption-layer]
Slim {id,name,status} read offered to other contexts for ACL checks
- **Provider**: [PetApp](../../../catalog_bc/services/pet_app/index.md)

	
