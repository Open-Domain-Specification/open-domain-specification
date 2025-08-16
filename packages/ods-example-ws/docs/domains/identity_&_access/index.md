


# Identity & Access (supporting)
Authentication/authorization via Duende IdentityServer.

![contextmap](./contextmap.svg)

## Subdomains

### [AuthN and AuthZ](subdomains/auth_n_and_auth_z/index.md)
OpenID Connect identity provider.



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [WebApp](../edge_&_experience/subdomains/web/boundedcontexts/web/services/web_app/index.md) | customer-supplier | IdentityService | IssueToken | open-host-service |
| [ShoppingBff](../edge_&_experience/subdomains/mobile/boundedcontexts/mobile_bff/services/shopping_bff/index.md) | customer-supplier | IdentityService | IssueToken | open-host-service |

	
