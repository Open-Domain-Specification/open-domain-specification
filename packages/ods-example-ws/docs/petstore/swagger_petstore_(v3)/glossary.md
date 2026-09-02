

# Swagger Petstore (v3) Glossary

## [Catalog BC](../boundedcontexts/catalog_bc/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Pet** | An animal listed for sale in the store | - | Pet |
| **Category** | The kind of animal a pet is, such as Dogs or Cats | Species | Category |
| **Available** | A pet that can be ordered; it becomes pending once an order is placed | - | PetStatus |


## [Sales BC](../boundedcontexts/sales_bc/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Order** | A customer's request to buy one pet in a given quantity | Purchase | Order |
| **Approval** | Confirmation that the ordered pet is available and reserved | - | ApproveOrder |


## [Inventory BC](../boundedcontexts/inventory_bc/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Availability** | How many pets are available, pending and sold right now; a projection, not a source of truth | Stock | InventoryProjection |


## [Fulfilment BC](../boundedcontexts/fulfilment_bc/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Shipment** | The consignment that carries one order to its owner | Consignment | Shipment |


## [Identity BC](../boundedcontexts/identity_bc/index.md)

| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **User** | Someone with a login; orders never refer to one | Account | User |


