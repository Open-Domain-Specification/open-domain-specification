

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


## Commands
> No commands.

## Events
| Name | Description | Attributes |
| --- | --- | --- |
| UserRegistered | New user created | - |
| UserUpdated | User fields updated | - |
| UserDeleted | User removed | - |
| UserLoggedIn | Login via /user/login | - |
| UserLoggedOut | Logout via /user/logout | - |


## Invariants
> No invariants.

## Provides

### (event) - UserRegistered [published-language]
New user created

### (event) - UserUpdated [published-language]
User fields updated

### (event) - UserDeleted [published-language]
User removed

### (event) - UserLoggedIn [published-language]
Login via /user/login

### (event) - UserLoggedOut [published-language]
Logout via /user/logout


## Consumes
> No consumptions.
	
