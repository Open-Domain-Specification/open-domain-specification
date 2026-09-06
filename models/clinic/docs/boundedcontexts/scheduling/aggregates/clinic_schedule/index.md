

# Clinic Schedule
One clinic session and its bookable slots.

![contextmap](./relationmap.svg)

![consumablemap](./consumablemap.svg)

## Entities and Value Objects
| Type | Name | Description | Attributes |
| --- | --- | --- | --- |
| Entity (Root) | **Clinic Session** | A run of appointments on a given day with a given clinician. | **sessionId**: `string`, clinicianName: `string`, date: `string`, specialty: `string` |
| Entity | Slot | One bookable appointment time within a clinic session. | **slotId**: `string`, startTime: `string`, status: `string` |


## Relationships
| Source | Description | Target | Relation | Cardinality |
| --- | --- | --- | --- | --- |
| [Clinic Schedule - Clinic Session](./index.md#entities-and-value-objects) | offers | Clinic Schedule - Slot | includes | 1..* |


## Invariants
> No invariants.

## Provides
> No consumables.

## Consumes
> No consumptions.
	
