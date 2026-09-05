

# Sales BC
Owns the Order aggregate and the order-facing operations

**Owned by:** Orders Team

## Serves
- [Petstore Commerce / Sales](../../domains/petstore_commerce/subdomains/sales/index.md) (core)

![contextmap](./contextmap.svg)

## Glossary
| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Order** | A customer's request to buy one pet; placed, then approved, then delivered | Purchase | Order |
| **Pet** | Only the identity of a catalogue pet; Sales holds no pet attributes and asks the catalogue for availability | - | petId |
| **Approval** | Confirmation that the ordered pet is available and reserved | - | ApproveOrder |


## Aggregates

### [Order](aggregates/order/index.md)
Order for a single pet


	
## Services

### [OrderApp](services/order_app/index.md)
Open-host service for /store/order endpoints



## Value Objects
| Name | Description | Attributes | Used by |
| --- | --- | --- | --- |
| OrderStatus | Where the order is in its lifecycle | value: `'placed' | 'approved' | 'delivered'` | Order |
| Quantity | The v3 API's quantity field, kept for the wire shape. A Pet is an individual animal, so the invariant below pins it to 1 | value: `int > 0` | Order |
| ShipDate | When the order ships; set by Fulfilment once dispatch is planned | value: `date-time` | Order |


## Schemas
| Name | Description | Attributes | Used by |
| --- | --- | --- | --- |
| OrderPlaced | - | **orderId**: `int64`, petId: `int64`, quantity: `Quantity` | OrderPlaced |
| PlaceOrder | Request body for placing an order | petId: `int64`, quantity: `Quantity` | PlaceOrder |
| OrderId | - | **orderId**: `int64` | OrderApproved, OrderDelivered, OrderDeleted, ApproveOrder, DeliverOrder, GetOrderById, DeleteOrder, ConfirmDelivery, ReservePet, MarkPetSold |
| OrderDetail | One order, as GET /store/order/{orderId} answers with it | **orderId**: `int64`, petId: `int64`, quantity: `Quantity`, shipDate: `ShipDate`, status: `OrderStatus` | GetOrderById |


## Policies
![flowmap](./flowmap.svg)

| Name | Description | On | Then |
| --- | --- | --- | --- |
| Approve when pet available | On OrderPlaced, or on PetStatusChanged to available, look up the placed orders for that petId, confirm availability through GetPetSummary and approve the oldest | PetStatusChanged, OrderPlaced | ApproveOrder |
| Reserve pet on approval | When an order is approved, hold its pet (available → pending) so nobody else can be approved for the same animal | OrderApproved | ReservePet |
| Mark pet sold on delivery | When an order is delivered, the pet is sold (pending → sold) | OrderDelivered | MarkPetSold |


## Context Relationships
### Depends on
| With | Description | Type | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Catalog BC | Sales needs pet availability; Catalog commits to the summary contract | customer-supplier | open-host-service | anti-corruption-layer |

- **Catalog BC** (customer-supplier)
	- Sales reads Catalog through PetSummaryClient, which maps the catalog payload onto the Sales order model. [sales/acl/PetSummaryClient.ts](https://github.com/example/petstore/blob/main/sales/acl/PetSummaryClient.ts)
	- The summary contract is versioned and published; Catalog will not break it without a major release. [catalog/openapi.yaml](https://github.com/example/petstore/blob/main/catalog/openapi.yaml)

### Depended on by
| With | Description | Type | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Inventory BC | The projection counts orders as Sales reports them | upstream-downstream | published-language | conformist |

- **Inventory BC** (upstream-downstream)
	- The projection conforms to the Sales order events rather than translating them; accepted while Inventory stays read-only. [inventory/projection/OrderEventHandler.ts](https://github.com/example/petstore/blob/main/inventory/projection/OrderEventHandler.ts)

### Works alongside
| With | Description | Type | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Fulfilment BC | Order lifecycle and shipment lifecycle are designed and released together | partnership | - | - |
| Identity BC | Orders are anonymous in Petstore v3; no integration by design | separate-ways | - | - |

- **Fulfilment BC** (partnership)
	- Both services ship from one release train; the pipeline deploys sales and fulfilment as a pair and fails the build if only one is tagged.
	- OrderApproved and ShipmentDelivered cross the boundary one way each, and Fulfilment calls ConfirmDelivery on top of that, all with no translation layer; each side depending on the other is what makes this a partnership rather than customer-supplier.
- **Identity BC** (separate-ways)
	- The order payload carries no user field and the Sales service holds no credentials for the Identity API, so nothing links an order to an account. [sales/openapi.yaml](https://github.com/example/petstore/blob/main/sales/openapi.yaml)
	- Keeping the two apart is deliberate: checkout must work for a visitor who never signs in. [ADR-007 Anonymous checkout](https://github.com/example/petstore/blob/main/docs/adr/007-anonymous-checkout.md)

- `open-host-service` — **Open Host Service** (OHS). A public, stable protocol or API provided by an upstream context.
- `anti-corruption-layer` — **Anti-Corruption Layer** (ACL). A translating boundary isolating a downstream model from external concepts.
- `conformist` — **Conformist** (CF). Downstream adopts the upstream domain model without translation.
- `published-language` — **Published Language** (PL). A well-documented shared interchange format.
- `upstream-downstream` — **Upstream/Downstream** (U/D). One context depends on another; the upstream does not plan around the downstream.
- `customer-supplier` — **Customer/Supplier** (C/S). Upstream plans for and prioritizes downstream requirements.
- `partnership` — **Partnership** (P). Mutual co-operation where teams coordinate development and releases.
- `separate-ways` — **Separate Ways** (SW). A deliberate decision to forego integration and develop independently.

## Consumptions
| Consumer | Made By | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- | --- |
| [ShipmentApp](../fulfilment_bc/services/shipment_app/index.md) | - | - | OrderApp | ConfirmDelivery | open-host-service |
| [OrderApp](services/order_app/index.md) | - | - | Order | DeliverOrder | - |
| [Shipment](../fulfilment_bc/aggregates/shipment/index.md) | - | conformist | Order | OrderApproved | published-language |
| [InventoryQuery](../inventory_bc/services/inventory_query/index.md) | - | conformist | Order | OrderApproved | published-language |
| [InventoryQuery](../inventory_bc/services/inventory_query/index.md) | - | conformist | Order | OrderDelivered | published-language |
| [InventoryQuery](../inventory_bc/services/inventory_query/index.md) | - | conformist | Order | OrderDeleted | published-language |
| [OrderApp](services/order_app/index.md) | - | anti-corruption-layer | PetApp | GetPetSummary | open-host-service |
| [PetApp](../catalog_bc/services/pet_app/index.md) | - | - | Pet | ReservePet | - |
| [PetApp](../catalog_bc/services/pet_app/index.md) | - | - | Pet | MarkPetSold | - |
| [OrderApp](services/order_app/index.md) | - | anti-corruption-layer | PetApp | MarkPetSoldForOrder | open-host-service |
| [OrderApp](services/order_app/index.md) | ReservePet | anti-corruption-layer | PetApp | ReservePetForOrder | open-host-service |
| [OrderApp](services/order_app/index.md) | - | - | Shipment | ShipmentDelivered | published-language |


