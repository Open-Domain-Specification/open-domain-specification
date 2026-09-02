

# Disc Rental (legacy)
> ⚠️ **Big ball of mud.** This context's model is not coherent; neighbours should protect themselves with an anti-corruption layer.

StreamLine Discs: a 2009 monolith with its own accounts and a monthly charge export. Modelled at its edge only

**Owned by:** Legacy Operations Team

## Serves
- [Viewing / Physical Rental](../../domains/viewing/subdomains/physical_rental/index.md) (supporting)

![contextmap](./contextmap.svg)

## Glossary
> No glossary terms.

## Aggregates

### [RentalQueue](aggregates/rental_queue/index.md)
As far as anyone knows, the central table


	
## Services
> No services.

## Schemas
| Name | Description | Attributes | Used by |
| --- | --- | --- | --- |
| DiscRentalInvoiced | The monthly export's shape | **legacyAccountId**: `string`, amountMinor: `int64` | DiscRentalInvoiced |


## Policies
> No policies.

## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Disc Rental (legacy) | upstream-downstream | Billing & Plans | published-language | anti-corruption-layer |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Subscription](../billing_&_plans/aggregates/subscription/index.md) | anti-corruption-layer | RentalQueue | DiscRentalInvoiced | published-language |


