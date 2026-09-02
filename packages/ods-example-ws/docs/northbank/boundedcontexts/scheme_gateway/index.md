

# Scheme Gateway
ISO 20022 messages to and from the schemes

**Owned by:** Scheme Connectivity Team

## Serves
- [Money Movement / Scheme Connectivity](../../domains/money_movement/subdomains/scheme_connectivity/index.md) (generic)

![contextmap](./contextmap.svg)

## Glossary
> No glossary terms.

## Aggregates

### [SchemeMessage](aggregates/scheme_message/index.md)
One message to or from a scheme


	
## Services
> No services.

## Schemas
| Name | Description | Attributes | Used by |
| --- | --- | --- | --- |
| SchemeSubmission | The scheme's format, not the bank's | **instructionId**: `string`, messageType: `SchemeFormat` | SubmitToScheme |
| SchemeSettlement | - | **instructionId**: `string`, schemeRef: `string` | SchemeSettlementConfirmed, SchemeRejected |


## Policies
> No policies.

## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Scheme Gateway | upstream-downstream | Payments Hub | open-host-service, published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [PaymentInstruction](../payments_hub/aggregates/payment_instruction/index.md) | conformist | SchemeMessage | SchemeSettlementConfirmed | published-language |
| [PaymentInstruction](../payments_hub/aggregates/payment_instruction/index.md) | conformist | SchemeMessage | SchemeRejected | published-language |
| [PaymentInstruction](../payments_hub/aggregates/payment_instruction/index.md) | conformist | SchemeMessage | SubmitToScheme | open-host-service |


