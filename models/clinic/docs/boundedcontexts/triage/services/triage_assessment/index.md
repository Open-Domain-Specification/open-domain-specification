


# Triage Assessment
The clinical decision logic a referral is judged against. The nurse's own account is that the assessment itself calls out to Records for what is already known about the patient -- not an application service fronting the call -- so that is what is modelled here, even though a domain service is not meant to call outside its own context.

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Rejects with | Raises | Guarded by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Check Patient History | operation | no | - | Checks what Records already holds for this referral's patient. | [Patient History Check Request](../../index.md#schemas) | [Patient Summary](../../../patient_records/index.md#schemas) | - | - | - |


## Consumes

### Get Patient Summary [conformist]
Looks a patient up by their internal id.
- **Provider**: [Patient Directory](../../../patient_records/services/patient_directory/index.md)

	
