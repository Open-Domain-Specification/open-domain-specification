

# User
Petstore user record

![contextmap](./relationmap.svg)

![consumablemap](./consumablemap.svg)

## Entities and Value Objects
| Type | Name | Description | Attributes |
| --- | --- | --- | --- |
| Entity (Root) | **User** | A registered user of the store | **username**: `string`, firstName: `string`, lastName: `string`, email: `string`, phone: `string`, userStatus: `UserStatus` |
| Value Object | UserStatus | Untyped int per the Petstore v3 model | value: `int` |


## Relationships
| Source | Description | Target | Relation | Cardinality |
| --- | --- | --- | --- | --- |
| [User](entities/user/index.md) | has-status | User - UserStatus | uses | - |


## Invariants
> No invariants.

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| UserRegistered | event | no | published-language | New user created | - | - |
| UserUpdated | event | no | published-language | User fields updated | - | - |
| UserDeleted | event | no | published-language | User removed | - | - |
| UserLoggedIn | event | no | published-language | Login via /user/login | - | - |
| UserLoggedOut | event | no | published-language | Logout via /user/logout | - | - |


## Consumes
> No consumptions.
	
