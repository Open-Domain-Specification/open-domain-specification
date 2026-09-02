

# Identity (generic)
Customer accounts and sign-in

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Identity](../../../../boundedcontexts/identity/index.md)
Customer accounts



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Identity | upstream-downstream | Cart & Checkout | open-host-service | conformist |
| Identity | upstream-downstream | Customer Service | open-host-service | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [CheckoutOrchestrator](../../../../boundedcontexts/cart_&_checkout/services/checkout_orchestrator/index.md) | conformist | IdentityAPI | GetCustomer | open-host-service |
| [Case](../../../../boundedcontexts/customer_service/aggregates/case/index.md) | conformist | IdentityAPI | GetCustomer | open-host-service |
	
	
