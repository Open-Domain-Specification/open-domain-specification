

# Backoffice
Admin/ops touchpoints (price updates, etc.).

![contextmap](./contextmap.svg)

## Bounded Contexts

### [BackofficeApp](boundedcontexts/backoffice_app/index.md)
Admin/demo app for price updates.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Backoffice](boundedcontexts/backoffice_app/services/backoffice/index.md) | customer-supplier | CatalogService | ChangePrice | open-host-service |
	
	
