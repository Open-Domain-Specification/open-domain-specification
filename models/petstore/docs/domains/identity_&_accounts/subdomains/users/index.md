

# Users (generic)
User records and login/logout. Generic: an off-the-shelf identity provider would serve

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Identity BC](../../../../boundedcontexts/identity_bc/index.md)
The user endpoints and the record they answer with, modelled at the boundary only. Legacy at that boundary: user status is an untyped int and login is a GET



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Identity BC | separate-ways | Sales BC | - | - |


## Consumptions
	
	
