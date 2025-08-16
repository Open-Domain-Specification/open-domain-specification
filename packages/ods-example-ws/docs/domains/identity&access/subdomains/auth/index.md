

# Auth
Identity server/token service

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Identity](boundedcontexts/identity/index.md)
Identity.API



## Relationships
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [OcelotGateway](../../../integration/subdomains/edge/boundedcontexts/api_gateway/services/ocelot_gateway/index.md) | conformist | IdentityService | IssueToken | open-host-service |
| [OrderingApp](../../../commerce/subdomains/sales/boundedcontexts/ordering/services/ordering_app/index.md) | anti-corruption-layer | IdentityService | IssueToken | open-host-service |
	
	
