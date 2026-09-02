

# CustomerAccount
Who is shopping

![contextmap](./relationmap.svg)

![consumablemap](./consumablemap.svg)

## Entities and Value Objects
| Type | Name | Description | Attributes |
| --- | --- | --- | --- |
| Entity (Root) | **CustomerAccount** | A registered customer | **customerId**: `string`, email: `string` |


## Relationships


## Invariants
> No invariants.

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| CustomerRegistered | event | no | published-language | A new customer account exists | - | - |


## Consumes
> No consumptions.
	
