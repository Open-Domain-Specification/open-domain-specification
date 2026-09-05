

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



## Invariants
> No invariants across aggregates.

## Value Objects
| Name | Description | Attributes | Used by |
| --- | --- | --- | --- |
| UserStatus | Untyped int per the Petstore v3 model; nobody remembers the meaning of each value | value: `int` | User |


## Schemas
| Name | Description | Attributes | Used by |
| --- | --- | --- | --- |
| User | The legacy user record, as GET /user/{username} answers with it | **username**: `string`, email: `string`, userStatus: `UserStatus` | GetUserByUsername |


## Policies
> No policies.

## Processes
> No processes.

## Context Relationships
### Works alongside
| With | Description | Type | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Sales BC | Orders are anonymous in Petstore v3; no integration by design | separate-ways | - | - |

- **Sales BC** (separate-ways)
	- The order payload carries no user field and the Sales service holds no credentials for the Identity API, so nothing links an order to an account. [sales/openapi.yaml](https://github.com/example/petstore/blob/main/sales/openapi.yaml)
	- Keeping the two apart is deliberate: checkout must work for a visitor who never signs in. [ADR-007 Anonymous checkout](https://github.com/example/petstore/blob/main/docs/adr/007-anonymous-checkout.md)

- `separate-ways` — **Separate Ways** (SW). A deliberate decision to forego integration and develop independently.

## Consumptions


