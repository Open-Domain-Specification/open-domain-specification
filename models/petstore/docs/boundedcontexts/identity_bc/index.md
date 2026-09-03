

# Identity BC
> ⚠️ **Big ball of mud.** This context's model is not coherent; neighbours should protect themselves with an anti-corruption layer.

Owns User aggregate & user endpoints. Legacy: user status is an untyped int and login is a GET

**Owned by:** [Platform Team](https://petstore.swagger.io/#/user)

## Serves
- [Identity & Accounts / Users](../../domains/identity_&_accounts/subdomains/users/index.md) (generic)

![contextmap](./contextmap.svg)

## Glossary
| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **User** | Someone with a login; orders never refer to one | Account | User |


## Aggregates

### [User](aggregates/user/index.md)
Petstore user record, as the legacy API shapes it


	
## Services

### [UserApp](services/user_app/index.md)
Open-host service for /user endpoints



## Schemas
> No schemas.

## Policies
> No policies.

## Context Relationships
### Works alongside
| With | Description | Type | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Sales BC | Orders are anonymous in Petstore v3; no integration by design | separate-ways | - | - |


## Consumptions


