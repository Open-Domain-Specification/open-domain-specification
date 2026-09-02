

# Credit Decisioning
Bureau data, the scorecard and affordability

**Owned by:** Credit Risk Team

## Serves
- [Credit / Credit Decisioning](../../domains/credit/subdomains/credit_decisioning/index.md) (core)

![contextmap](./contextmap.svg)

## Glossary
| Term | Definition | Aliases | Embodied by |
| --- | --- | --- | --- |
| **Scorecard** | The bank's own credit model | - | Scorecard |
| **Decline reason** | A code the customer is entitled to see when refused | - | CreditScore |


## Aggregates

### [CreditDecision](aggregates/credit_decision/index.md)
One decision and the evidence behind it, kept so it can be explained


	
## Services

### [Scorecard](services/scorecard/index.md)
The bank's own model; a domain service because it is tuned across the whole book



## Schemas
| Name | Description | Attributes | Used by |
| --- | --- | --- | --- |
| DecisionRequest | - | **applicationId**: `string`, customerId: `string`, requestedMinor: `int64`, termMonths: `int` | Decide |
| DecisionMade | - | **applicationId**: `string`, outcome: `'approved' | 'declined'`, score: `CreditScore` | DecisionMade |


## Policies
> No policies.

## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Customer & KYC | upstream-downstream | Credit Decisioning | open-host-service | anti-corruption-layer |
| Lending | partnership | Credit Decisioning | - | - |
| Branch & Contact Centre | separate-ways | Credit Decisioning | - | - |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [LoanApplication](../lending/aggregates/loan_application/index.md) | conformist | CreditDecision | DecisionMade | published-language |
| [LoanApplication](../lending/aggregates/loan_application/index.md) | conformist | CreditDecision | Decide | open-host-service |
| [ServiceRequest](../branch_&_contact_centre/aggregates/service_request/index.md) | anti-corruption-layer | CreditDecision | Decide | open-host-service |
| [CreditDecision](aggregates/credit_decision/index.md) | anti-corruption-layer | OnboardingApp | GetCustomer | open-host-service |


