


# Lab Ordering
Sends a patient for testing at the lab, and folds the result back into our own case once it is translated.

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Rejects with | Raises | Guarded by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Send Referral For Testing | operation | no | - | Called once the assessment decides a test is needed. | [Lab Test Request Details](../../index.md#schemas) | - | - | - | - |


## Consumes

### Order Test [anti-corruption-layer]
Takes a test order, in the lab's own request shape.
- **Provider**: [Lab Interface](../../../laboratory/services/lab_interface/index.md)

### Test Result Reported [anti-corruption-layer]
A result is ready, reported in the lab's own format.
- **Provider**: [Lab Interface](../../../laboratory/services/lab_interface/index.md)
- **Made by**: Record Lab Result On Receipt

	
