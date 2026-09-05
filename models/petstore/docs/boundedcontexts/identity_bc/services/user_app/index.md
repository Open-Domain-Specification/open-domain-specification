


# UserApp
Open-host service for /user endpoints

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Raises | Guarded by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CreateUser | operation | no | open-host-service | POST /user | - | - | UserRegistered | - |
| Login | operation | no | open-host-service | GET /user/login?username=&password= (a GET with credentials: legacy, recorded not endorsed) | - | - | UserLoggedIn | - |
| Logout | operation | no | open-host-service | GET /user/logout | - | - | UserLoggedOut | - |
| GetUserByUsername | operation | no | open-host-service | GET /user/{username} | - | [User](../../index.md#schemas) | - | - |


## Consumes
> No consumptions.
	
