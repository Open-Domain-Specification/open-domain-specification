

# Pet
A pet listed in the store

![contextmap](./relationmap.svg)

![consumablemap](./consumablemap.svg)

## Entities and Value Objects
| Type | Name | Description | Attributes |
| --- | --- | --- | --- |
| Entity (Root) | **Pet** | Pet root entity | **id**: `int64`, name: `string`, category: `Category`, photoUrls: `PhotoUrl[]`, tags: `Tag[]`, status: `PetStatus` |
| Value Object | Category | The kind of animal, e.g. Dogs | id: `int64`, name: `string` |
| Value Object | Tag | Free-form label on a pet | id: `int64`, name: `string` |
| Value Object | PhotoUrl | Where a photo of the pet can be fetched | url: `string (URL)` |
| Value Object | PetStatus | Where the pet is in its sales lifecycle | value: `'available' | 'pending' | 'sold'` |


## Relationships
| Source | Description | Target | Relation |
| --- | --- | --- | --- |
| [Pet](entities/pet/index.md) | categorized-as | Pet - Category | uses |
| [Pet](entities/pet/index.md) | tagged-with | Pet - Tag | uses |
| [Pet](entities/pet/index.md) | has-photo | Pet - PhotoUrl | uses |
| [Pet](entities/pet/index.md) | has-status | Pet - PetStatus | uses |


## Commands
| Name | Description | Attributes | Raises |
| --- | --- | --- | --- |
| RegisterPet | Add a new pet to the catalog | name: `string`, category: `Category`, photoUrls: `PhotoUrl[]` | PetRegistered |
| ChangePetStatus | Move a pet between available, pending and sold | **petId**: `int64`, status: `PetStatus` | PetStatusChanged |
| RemovePet | Remove a pet from the catalog | **petId**: `int64` | PetDeleted |


## Events
| Name | Description | Attributes |
| --- | --- | --- |
| PetRegistered | A new pet was registered | **petId**: `int64`, name: `string`, category: `Category`, status: `PetStatus` |
| PetUpdated | Pet profile updated | - |
| PetStatusChanged | Pet status changed (available|pending|sold) | **petId**: `int64`, from: `PetStatus`, to: `PetStatus` |
| PetPhotoUploaded | Photo added via upload | - |
| PetDeleted | Pet removed from catalog | - |


## Invariants
| Name | Description |
| --- | --- |
| NameRequired | Pet.name must be non-empty |
| SoldNotReopen | Once sold, do not revert to available without explicit policy |


## Provides

### (event) - PetRegistered [published-language]
undefined

### (event) - PetUpdated [published-language]
undefined

### (event) - PetStatusChanged [published-language]
undefined

### (event) - PetPhotoUploaded [published-language]
undefined

### (event) - PetDeleted [published-language]
undefined


## Consumes
> No consumptions.
	
