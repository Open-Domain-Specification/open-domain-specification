

# Appointment Scheduling (supporting)
Turning an accepted case into a booked clinic slot, and keeping the record of clinics, slots, bookings and cancellations.

![contextmap](./contextmap.svg)

## Bounded Contexts

### [Scheduling](../../../../boundedcontexts/scheduling/index.md)
Turns an accepted case into a booked clinic slot, and keeps the record of clinics, slots, bookings and cancellations.



## Context Relationships
| Upstream | Relationship | Downstream | Upstream Roles | Downstream Roles |
| --- | --- | --- | --- | --- |
| Triage | upstream-downstream | Scheduling | published-language | conformist |


## Consumptions
| Consumer | Consumed As | Provider | Consumable | Provided As |
| --- | --- | --- | --- | --- |
| [Scheduling Desk](../../../../boundedcontexts/scheduling/services/scheduling_desk/index.md) | conformist | Referral Case | Referral Accepted | published-language |
	
	
