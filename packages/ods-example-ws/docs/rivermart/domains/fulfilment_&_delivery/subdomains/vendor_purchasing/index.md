

# Vendor Purchasing (supporting)
Buying first-party stock from wholesale vendors

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Vendor Purchasing (legacy)](../../../../boundedcontexts/vendor_purchasing_(legacy)/index.md)
The 2009 purchasing system for first-party stock. Batch jobs, shared tables, no owner of the schema



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Vendor Purchasing (legacy) | upstream-downstream | Warehouse | published-language | anti-corruption-layer |
| Vendor Purchasing (legacy) | separate-ways | Seller Onboarding | - | - |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [InventoryPosition](../../../../boundedcontexts/warehouse/aggregates/inventory_position/index.md) | anti-corruption-layer | PurchaseOrder | PurchaseOrderReceived | published-language |
	
	
