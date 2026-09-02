


# UserApp
Open-host service for /user endpoints

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Raises |
| --- | --- | --- | --- | --- | --- | --- |
| CreateUser | operation | no | open-host-service | POST /user | - | UserRegistered |
| CreateUsersWithArray | operation | no | open-host-service | POST /user/createWithArray | - | UserRegistered |
| CreateUsersWithList | operation | no | open-host-service | POST /user/createWithList | - | UserRegistered |
| Login | operation | no | open-host-service | GET /user/login?username=&password= | - | UserLoggedIn |
| Logout | operation | no | open-host-service | GET /user/logout | - | UserLoggedOut |
| GetUserByUsername | operation | no | open-host-service | GET /user/{username} | - | - |
| UpdateUser | operation | no | open-host-service | PUT /user/{username} | - | UserUpdated |
| DeleteUser | operation | no | open-host-service | DELETE /user/{username} | - | UserDeleted |


## Consumes
> No consumptions.
	
