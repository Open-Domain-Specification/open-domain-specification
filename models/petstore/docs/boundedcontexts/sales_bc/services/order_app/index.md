


# OrderApp
Open-host service for /store/order endpoints

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Rejects with | Raises | Guarded by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PlaceOrder | operation | no | open-host-service | POST /store/order | [PlaceOrder](../../index.md#schemas) | - | - | OrderPlaced | - |
| GetOrderById | operation | no | open-host-service | GET /store/order/{orderId} | [OrderId](../../index.md#schemas) | [OrderDetail](../../index.md#schemas) | - | - | - |
| DeleteOrder | operation | no | open-host-service | DELETE /store/order/{orderId} | [OrderId](../../index.md#schemas) | - | - | OrderDeleted | - |
| ConfirmDelivery | operation | no | open-host-service | POST /store/order/{orderId}/delivered; Fulfilment reports the shipment arrived and the order moves to delivered | [OrderId](../../index.md#schemas) | - | - | - | - |
| ReservePet | operation | yes | - | Ask Catalog to hold the ordered pet, through the ACL; Sales' own step in the order lifecycle | [OrderId](../../index.md#schemas) | - | - | - | - |
| MarkPetSold | operation | yes | - | Tell Catalog the ordered pet has gone to its owner, through the ACL | [OrderId](../../index.md#schemas) | - | - | - | - |
| CheckPetAvailable | operation | yes | - | Read the ordered pet's summary from Catalog, through the ACL, and decide whether Sales may approve the order | [OrderId](../../index.md#schemas) | - | - | - | ApproveOnlyWhenAvailable |

- **ConfirmDelivery** also reaches OrderDelivered through the operations it calls, raised where they happen rather than restated here.
- **ReservePet** also reaches PetReserved through the operations it calls, raised where they happen rather than restated here.
- **MarkPetSold** also reaches PetSold through the operations it calls, raised where they happen rather than restated here.

## Consumes

### DeliverOrder 
Mark an approved order as delivered; run by OrderApp when Fulfilment reports the shipment arrived
- **Provider**: [Order](../../aggregates/order/index.md)
- **Made by**: ConfirmDelivery

### ReservePetForOrder [anti-corruption-layer]
POST /pet/{petId}/reserve; holds the pet for an approved order by running the aggregate's ReservePet
- **Provider**: [PetApp](../../../catalog_bc/services/pet_app/index.md)
- **Made by**: ReservePet

### MarkPetSoldForOrder [anti-corruption-layer]
POST /pet/{petId}/sold; records the sale by running the aggregate's MarkPetSold
- **Provider**: [PetApp](../../../catalog_bc/services/pet_app/index.md)
- **Made by**: MarkPetSold

### GetPetSummary [anti-corruption-layer]
GET /pets/{id}/summary; asked with a PetId, answers with a PetSummary, so Sales can check availability without coupling to the full Pet
- **Provider**: [PetApp](../../../catalog_bc/services/pet_app/index.md)
- **Made by**: CheckPetAvailable

### PetStatusChanged [anti-corruption-layer]
The catalogue moved a pet between statuses itself, e.g. relisting a returned pet as available
- **Provider**: [Pet](../../../catalog_bc/aggregates/pet/index.md)
- **Made by**: Order fulfilment

	
