

# Patient Identity (supporting)
Knowing who a patient is, and what every other system that refers to them calls them.

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Patient Records](../../../../boundedcontexts/patient_records/index.md)
Holds who our patients are, and what every outside system that refers to them calls them.



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Patient Records | upstream-downstream | Triage | open-host-service | conformist |
| Triage | upstream-downstream | Patient Records | published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Triage Assessment](../../../../boundedcontexts/triage/services/triage_assessment/index.md) | conformist | Patient Directory | Get Patient Summary | open-host-service |
| [Patient Directory](../../../../boundedcontexts/patient_records/services/patient_directory/index.md) | conformist | Referral Case | Referral Registered | published-language |
	
	
