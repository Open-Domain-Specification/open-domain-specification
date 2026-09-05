


# PetApp
Open-host service for /pet endpoints

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Rejects with | Raises | Guarded by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AddPet | operation | no | open-host-service | POST /pet | [RegisterPet](../../index.md#schemas) | - | - | PetRegistered | - |
| UpdatePet | operation | no | open-host-service | PUT /pet | - | - | - | PetUpdated | - |
| FindPetsByStatus | operation | no | open-host-service | GET /pet/findByStatus?status=available|pending|sold | - | [Pet](../../index.md#schemas) | - | - | - |
| GetPetById | operation | no | open-host-service | GET /pet/{petId} | [PetId](../../index.md#schemas) | [Pet](../../index.md#schemas) | - | - | - |
| UploadImage | operation | no | open-host-service | POST /pet/{petId}/uploadImage; adds a PhotoUrl, so it is a profile update | [PetId](../../index.md#schemas) | - | - | PetUpdated | - |
| DeletePet | operation | no | open-host-service | DELETE /pet/{petId} | [PetId](../../index.md#schemas) | - | - | PetDeleted | - |
| GetPetSummary | operation | no | open-host-service | GET /pets/{id}/summary; asked with a PetId, answers with a PetSummary, so Sales can check availability without coupling to the full Pet | [PetId](../../index.md#schemas) | [PetSummary](../../index.md#schemas) | - | - | - |
| ReservePetForOrder | operation | no | open-host-service | POST /pet/{petId}/reserve; holds the pet for an approved order by running the aggregate's ReservePet | [PetId](../../index.md#schemas) | - | [PetUnavailable](../../index.md#schemas) | PetStatusChanged | - |
| MarkPetSoldForOrder | operation | no | open-host-service | POST /pet/{petId}/sold; records the sale by running the aggregate's MarkPetSold | [PetId](../../index.md#schemas) | - | - | PetStatusChanged | - |

- **GetPetSummary**
	- The summary projection is the only Catalog read Sales is allowed to make. [GET /pets/{id}/summary](https://github.com/example/petstore/blob/main/catalog/openapi.yaml#/paths/~1pets~1{id}~1summary)
- **ReservePetForOrder**
	- Reservation is a synchronous call into Catalog; it should become an order-placed subscription so Sales stops blocking on Catalog. [ADR-017 Reserve asynchronously](https://github.com/example/petstore/blob/main/docs/adr/017-reserve-asynchronously.md)

## Consumes

### ReservePet 
available → pending: the pet is held for an approved order; run by PetApp on the request Sales makes
- **Provider**: [Pet](../../aggregates/pet/index.md)

### MarkPetSold 
pending → sold: the pet has gone to its owner; run by PetApp on the request Sales makes
- **Provider**: [Pet](../../aggregates/pet/index.md)

	
