

# Identity (generic)
Accounts and sign-in

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Identity](../../../../boundedcontexts/identity/index.md)
Accounts and sign-in



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Identity | upstream-downstream | Households & Profiles | published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Household](../../../../boundedcontexts/households_&_profiles/aggregates/household/index.md) | conformist | Account | AccountCreated | published-language |
	
	
