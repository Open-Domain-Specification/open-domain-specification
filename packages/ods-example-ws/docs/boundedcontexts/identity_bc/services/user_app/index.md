


# UserApp
Open-host service for /user endpoints

![consumablemap](./consumablemap.svg)

## Provides

### (operation) - CreateUser [open-host-service]
POST /user

### (operation) - CreateUsersWithArray [open-host-service]
POST /user/createWithArray

### (operation) - CreateUsersWithList [open-host-service]
POST /user/createWithList

### (operation) - Login [open-host-service]
GET /user/login?username=&password=

### (operation) - Logout [open-host-service]
GET /user/logout

### (operation) - GetUserByUsername [open-host-service]
GET /user/{username}

### (operation) - UpdateUser [open-host-service]
PUT /user/{username}

### (operation) - DeleteUser [open-host-service]
DELETE /user/{username}


## Consumes
> No consumptions.
	
