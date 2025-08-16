


# CatalogService
Queries, pricing updates, stock

![consumablemap](./consumablemap.svg)

## Provides

### (operation) - GetProduct [open-host-service]
Fetch product by id/sku

### (operation) - SearchProducts [open-host-service]
Filter & paging

### (operation) - ChangePrice [open-host-service]
Update price (emits event)

### (event) - ProductPriceChanged [published-language]
Catalog price change


## Consumes
> No consumptions.
	
