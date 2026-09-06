---
column: review
labels: [models]
priority: medium
agent: developer
live: false
clean-code-swept: true
updatedAt: 2026-09-06T14:02:08.000Z
---
# The clinic says what the record has a shape for

Card 117's two worked-around shapes were judged by both debate parties to be the record's own shapes chosen wrongly. `Triage Assessment` is a domain service holding only a call to Records; card 92 folded the same shape into a front, and the nurse's real rule, a record must exist before a referral is accepted, is a precondition on `Accept Referral` reading the summary its front fetched (decision 19, card 116). `Offer Slot` returns a booking and rejects with a waitlisting, and the scheduler's words are two facts, neither a refusal, with no caller waiting; the operation already raises both events and the record's shape is the `raises` list with no `returns` or `rejects`. The model's one deliberate diagnostic goes away.

## Checklist

- [x] `Referral Intake` (or the operation that accepts a referral) consumes Records' `Get Patient Summary` `by` the accepting operation; `Triage Assessment` is removed or keeps only clinical logic with no consumption; a precondition on `Accept Referral` constrains the fetched summary's attribute per decision 19's card-116 reach; `domain-service-consumes-inside` no longer fires
- [x] `Offer Slot` has no `returns` and no `rejects`; it raises `BookingConfirmed` and `PatientWaitlisted`; whatever reacts to the patient's answer hears one of the two events; the interview text stands, the model's comments and `DISCOVERY.md` gain a revision note saying which record shape each is
- [x] The card 117 journal is not rewritten; this card's Comments record the correction; the clinic's test pins zero diagnostics; `bash scripts/verify-all.sh` green

## Gates

- [x] clean-code-swept — read the whole diff before committing; smallest change satisfying the checklist, no drive-by refactors (developer, 2026-09-06T14:02:08.000Z)

## Comments

- **developer** (2026-09-06T14:02:08.000Z): Reset to `origin/develop` at `48e51e8` ("card 117 done and ruled"), `npm install`, then read the card, `models/clinic/DISCOVERY.md`, `models/clinic/src/workspace.ts`, decisions 13/17/18/19/21/25, card 117's journal, petstore's `ApproveOnlyWhenAvailable`/`CheckPetAvailable` shape (`models/petstore/src/workspace.ts:677-697,777-783,850-855`), and NorthBank's `DecisioningApp` `by: [decide]` shape (`models/northbank/src/workspace.ts:2722-2759`).
- **developer** (2026-09-06T14:02:08.000Z): Removed `Triage Assessment` entirely — it held only the call to Records, no clinical logic of its own — at `models/clinic/src/workspace.ts` (the domain service, its `Check Patient History` operation, `patientHistoryCheckRequestSchema`, and the `Assessment` glossary term are gone). `Accept Referral` on `Referral Case` is now `internal: true` with no consumer-facing description (`models/clinic/src/workspace.ts:445-450`), exactly as petstore's `Pet.DeliverOrder` is internal behind `OrderApp.ConfirmDelivery` (decision 17). A new precondition `Accept Only Known Patient` on `Referral Case` (`models/clinic/src/workspace.ts:462-473`) constrains `referralStatusAttr` and `acceptReferralOp` first, then, once `Referral Intake` exists, also constrains its new `Accept Referral` front operation and `PatientSummary.patientId` (`models/clinic/src/workspace.ts:566-594`) — the same two-call `constrains` shape as petstore's `approveOnlyWhenAvailable.constrains(checkPetAvailable, petSummaryStatus)` (decision 19's card-116 reach). `Referral Intake` now provides `Accept Referral` (the nurse-facing operation) and consumes both Records' `Get Patient Summary` (`pattern: "conformist"`) and the aggregate's internal `Accept Referral`, both `by: [acceptReferralFrontOp]` (decision 21). `domain-service-consumes-inside` no longer fires.
- **developer** (2026-09-06T14:02:08.000Z): `Offer Slot` (`models/clinic/src/workspace.ts:770-775`) no longer names `returns` or `rejects`; it still raises both `Booking Confirmed` and `Patient Waitlisted` (unchanged), and the appointment lifecycle process already starts on `Booking Confirmed` — nothing needed adding for a reactor. Updated `patientWaitlistedSchema`'s description away from "carried as a rejection" language. The scheduler's interview text in `models/clinic/DISCOVERY.md` is unchanged; only the "What the model could not say" section is rewritten as a "Revision (card 122)" section naming each correction against the record shape it fixes (`models/clinic/DISCOVERY.md`).
- **developer** (2026-09-06T14:02:08.000Z): Card 117's journal (`boards/project-backlog/117-a-fifth-model-written-blind-in-an-unfamiliar-domain.md`) left untouched. Updated `models/clinic/src/workspace.test.ts` — `DELIBERATE` is now an empty array with a comment explaining the diagnostic went away and pointing back at this card. `models/clinic` build (`npm run build`) regenerates `.ods` and `docs/` with zero diagnostics; nothing hand-edited there. `npx vitest run` in `models/clinic` — 7/7 green, including the round-trip and doc-site assertions. `bash scripts/verify-all.sh` — green end to end (see EVIDENCE in the final report); the diagrams-sketch e2e passed on the first run, no retry needed.
