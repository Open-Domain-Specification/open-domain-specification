

# Users (generic)
User records and login/logout

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Identity BC](../../../../boundedcontexts/identity_bc/index.md)
Owns User aggregate & user endpoints. Legacy: user status is an untyped int and login is a GET



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Identity BC | separate-ways | Sales BC | - | - |


## Consumptions
	
	
