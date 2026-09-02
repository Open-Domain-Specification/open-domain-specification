

# User
Petstore user record

![contextmap](./relationmap.svg)

![consumablemap](./consumablemap.svg)

## Entities and Value Objects
| Type | Name | Description |
| --- | --- | --- |
| Entity (Root) | **User** | username, firstName, lastName, email, password, phone, userStatus(int) |
| Value Object | UserStatus | int (per Petstore v3 model) |


## Relationships
| Source | Description | Target | Relation |
| --- | --- | --- | --- |
| [User](entities/user/index.md) | has-status | User - UserStatus | uses |


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
undefined

### (event) - UserUpdated [published-language]
undefined

### (event) - UserDeleted [published-language]
undefined

### (event) - UserLoggedIn [published-language]
undefined

### (event) - UserLoggedOut [published-language]
undefined


## Consumes
> No consumptions.
	
