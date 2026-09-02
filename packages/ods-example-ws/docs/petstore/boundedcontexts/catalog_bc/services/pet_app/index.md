


# PetApp
Open-host service for /pet endpoints

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| AddPet | operation | no | open-host-service | POST /pet | [RegisterPet](../../index.md#schemas) | PetRegistered |
| UpdatePet | operation | no | open-host-service | PUT /pet | - | PetUpdated |
| FindPetsByStatus | operation | no | open-host-service | GET /pet/findByStatus?status=available|pending|sold | - | - |
| GetPetById | operation | no | open-host-service | GET /pet/{petId} | [PetId](../../index.md#schemas) | - |
| DeletePet | operation | no | open-host-service | DELETE /pet/{petId} | [PetId](../../index.md#schemas) | PetDeleted |
| GetPetSummary | operation | no | open-host-service | Slim {id,name,status} read offered to other contexts, so Sales can check availability without coupling to the full Pet | [PetId](../../index.md#schemas) | - |


## Consumes
> No consumptions.
	
