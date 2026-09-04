


# DispatchPlanner
Chooses ship dates across planned shipments so orders approved on the same day leave together; it only needs orderIds and dates, which is all OrderApproved gives it

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Raises | Guarded by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| PlanDispatch | operation | yes | - | Create a shipment and pick its ship date for an approved order | - | - | ShipmentPlanned | - |


## Consumes
> No consumptions.
	
