---
column: todo
labels: [models]
priority: medium
agent: developer
live: true
updatedAt: 2026-09-10T20:10:00.000Z
---
# The clinic says what the record has a shape for

Card 117's two worked-around shapes were judged by both debate parties to be the record's own shapes chosen wrongly. `Triage Assessment` is a domain service holding only a call to Records; card 92 folded the same shape into a front, and the nurse's real rule, a record must exist before a referral is accepted, is a precondition on `Accept Referral` reading the summary its front fetched (decision 19, card 116). `Offer Slot` returns a booking and rejects with a waitlisting, and the scheduler's words are two facts, neither a refusal, with no caller waiting; the operation already raises both events and the record's shape is the `raises` list with no `returns` or `rejects`. The model's one deliberate diagnostic goes away.

## Checklist

- [ ] `Referral Intake` (or the operation that accepts a referral) consumes Records' `Get Patient Summary` `by` the accepting operation; `Triage Assessment` is removed or keeps only clinical logic with no consumption; a precondition on `Accept Referral` constrains the fetched summary's attribute per decision 19's card-116 reach; `domain-service-consumes-inside` no longer fires
- [ ] `Offer Slot` has no `returns` and no `rejects`; it raises `BookingConfirmed` and `PatientWaitlisted`; whatever reacts to the patient's answer hears one of the two events; the interview text stands, the model's comments and `DISCOVERY.md` gain a revision note saying which record shape each is
- [ ] The card 117 journal is not rewritten; this card's Comments record the correction; the clinic's test pins zero diagnostics; `bash scripts/verify-all.sh` green

## Comments
