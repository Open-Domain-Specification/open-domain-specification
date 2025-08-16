


# BasketService
Basket CRUD, pricing snapshot

![consumablemap](./consumablemap.svg)

## Provides

### (operation) - GetBasket [open-host-service]
Fetch buyer basket

### (operation) - AddItem [open-host-service]
Add product to basket

### (operation) - ClearBasket [open-host-service]
Clear basket


## Consumes

### ProductPriceChanged [conformist]
Catalog price change
- **Provider**: [CatalogService](../../../../../cataloging/boundedcontexts/catalog/services/catalog_service/index.md)

### OrderStarted [conformist]
Order submitted
- **Provider**: [OrderingApp](../../../../../sales/boundedcontexts/ordering/services/ordering_app/index.md)

	
