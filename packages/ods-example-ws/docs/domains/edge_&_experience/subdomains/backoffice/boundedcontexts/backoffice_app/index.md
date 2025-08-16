

# BackofficeApp
Admin/demo app for price updates.

![contextmap](./contextmap.svg)

## Aggregates
> No aggregates.
	
## Services

### [Backoffice](services/backoffice/index.md)
Uses open-host operations for admin workflows.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Backoffice](services/backoffice/index.md) | customer-supplier | CatalogService | ChangePrice | open-host-service |


