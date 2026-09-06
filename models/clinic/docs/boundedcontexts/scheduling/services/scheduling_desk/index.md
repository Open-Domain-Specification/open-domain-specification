


# Scheduling Desk
Offers the patient a slot once triage accepts their case.

![consumablemap](./consumablemap.svg)

## Provides
| Name | Type | Internal | Pattern | Description | Schema | Returns | Rejects with | Raises | Guarded by |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Offer Slot | operation | no | - | Offers the patient the next open slot for the case's specialty. The patient's answer is two facts, not a refusal either way: booked, or waitlisted. Neither caller waits synchronously on the answer, so the operation names no returns and no rejects -- it raises whichever of the two happened (see DISCOVERY.md). | [Slot Offer Request](../../index.md#schemas) | - | - | Booking Confirmed, Patient Waitlisted | Slot Offered Once |


## Consumes

### Referral Accepted [conformist]
A case has been accepted and is ready to be scheduled.
- **Provider**: [Referral Case](../../../triage/aggregates/referral_case/index.md)
- **Made by**: Offer Slot On Acceptance

	
