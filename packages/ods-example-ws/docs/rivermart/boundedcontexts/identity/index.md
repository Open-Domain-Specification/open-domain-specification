

# Identity
Customer accounts

**Owned by:** Platform Team

## Serves
- [Platform / Identity](../../domains/platform/subdomains/identity/index.md) (generic)

![contextmap](./contextmap.svg)

## Glossary
> No glossary terms.

## Aggregates

### [CustomerAccount](aggregates/customer_account/index.md)
Who is shopping


	
## Services

### [IdentityAPI](services/identity_api/index.md)
Account endpoints



## Schemas
> No schemas.

## Policies
> No policies.

## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Identity | upstream-downstream | Cart & Checkout | open-host-service | conformist |
| Identity | upstream-downstream | Customer Service | open-host-service | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [CheckoutOrchestrator](../cart_&_checkout/services/checkout_orchestrator/index.md) | conformist | IdentityAPI | GetCustomer | open-host-service |
| [Case](../customer_service/aggregates/case/index.md) | conformist | IdentityAPI | GetCustomer | open-host-service |


