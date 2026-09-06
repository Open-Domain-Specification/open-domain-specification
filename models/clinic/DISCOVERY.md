# Discovery — an outpatient clinic

Four short interviews, written up in the interviewee's own words as far as
possible. This model was written without reading `models/petstore`,
`models/rivermart`, `models/streamline` or `models/northbank`; the skill
under `packages/skill/skill` and the docs under `apps/docs/docs` are the only
guide followed.

## The practice manager

*"What does the clinic do, and for whom?"*

We run outpatient clinics for people referred by their GP. A referral comes
in from the GP's practice system — it's not our software, it's whatever
system their surgery runs, and it sends us its own message format, not
ours. Our triage nurses look at every referral and decide whether we take
it, whether we need more information from the GP first, or whether we
decline it. If we take it, sometimes a consultant needs to look at it
personally before we go further. Once a case is accepted, scheduling finds
the patient a clinic slot. We also send some patients for tests at the lab
before they're seen — that's a separate organisation too, we send them an
order and they get back to us with the result whenever it's ready, not
straight away. And there's a regulator that publishes the clinical coding
standard — the codes we're required to record a diagnosis against. We don't
call them for anything; they just publish the standard and we follow it.

*"Which parts does each team look after?"* Triage is one team, scheduling
another, and the records office — who look after knowing who our patients
are — a third. The GP systems, the lab and the regulator aren't ours; we
don't own or run any of them.

## The triage nurse

*"Walk me through a referral."*

It lands from the GP practice system as their message — a referral number,
who the patient is by the GP's own patient number, the specialty asked for,
how urgent they say it is, and a clinical summary. The first thing we do is
turn that into one of our own cases — we don't keep it in their shape,
because every practice system writes it slightly differently and we'd be
stuck if the GP system changed its format on us.

Once it's a case of ours, I look at it and I do one of three things: accept
it, ask the GP for more information, or decline it. If I accept it and it's
a complicated one, I hand it to a consultant to look at properly before it
goes any further.

*"What do you check before you decide?"*

Two things, and they're not the same kind of check. First, before I can
mark a referral accepted, my assessment has to check whether we already
hold a record for that patient — it's the assessment itself that goes and
asks the records office for that, not the reception desk that logged the
referral. I know that's supposed to run through the front-of-house side of
triage, but that isn't how it actually happens — the assessment logic is
what calls out, so that's what I told you to write down.

Second, every accepted referral has to carry a diagnosis code from the
national coding standard the regulator publishes. We don't ask the
regulator anything — there's nothing to ask, they just publish the list of
valid codes and we're required to use it.

*"What do you record when a referral changes state?"*

We raise a fact each time: a referral is registered when it first becomes a
case of ours, accepted, sent back asking for more information, or declined.
And if it's handed to a consultant, that's its own fact too. Asking for
more information is really only something we track ourselves — nobody else
in this model reacts to it — so that stays inside triage.

*"And the lab?"*

We ask the lab to run a test; they take the order in their own terms and
tell us later, in their own way, when the result's ready. We fold that
result into the case the way we did the referral — translated into ours,
not kept in theirs — because their message shape is theirs to change and I
don't want that changing what a "result" means to us.

## The scheduler

*"What does scheduling hold?"*

Clinics — a run of appointments on a given day with a given clinician — and
each clinic has slots. Booking a slot is its own thing: a patient is put
against a slot, and that booking can later be cancelled.

*"How does a referral turn into a booking?"*

Once triage accepts a case, we offer the patient a slot. And this is the
part I'm not sure how to describe cleanly: the patient can say yes, in
which case it's booked, or they can say the slot doesn't work for them, in
which case they go on our waiting list for a better one instead. Both of
those are things that really happened — a booking or a waiting-list entry —
neither is really us telling them no. I don't have a good word for "the
call answered with a second thing that happened, not a refusal", so I'm not
sure what you'll be able to write for that.

*"What happens after a booking is made?"*

Nothing, until either the patient cancels, or the day of the appointment
arrives. We hold that open the whole time — we need to remember whether a
cancellation ever came in.

## The records officer

*"What do you keep?"*

Who our patients are. Not much more than that — name, date of birth, the
number we use for them internally. What I actually spend my time on is
matching: the GP's practice system knows a patient by their own number, and
if that patient is ever referred somewhere with a lab test, the lab has its
own reference for them too. My job is knowing that "GP number 4471" and
"our patient P-2201" are the same person, so when triage looks a patient
up, they get the one record, not three.

*"Do you ever hold two of those for the same outside system?"*

No — one external reference per system per patient, and if I ever see a
second one turn up for the same system, that's a mistake I have to catch,
not something we allow to sit there.

## What the model could not say

- **The lab's own reference number.** The lab is an external context and
  the model does not know its internal shape, so the only thing recorded
  about a lab test in our own case is the lab's own order reference, held as
  an `identifies` attribute pointing at the Laboratory context itself, and
  the result once it is translated in.

## Revision (card 122)

Card 117's debate judged the two entries this section used to carry above as
the record's own shapes chosen wrongly, not the domain's honest awkwardness —
both are corrected here, and each is named against the record shape it is a
correction of:

- **The outbound call from a domain service** (`Triage Assessment`) was a
  worked-around shape for a precondition, decision 19's card-116 shape (an
  invariant reading what a front fetched). `Triage Assessment` held nothing
  but the call to Records, so it is removed rather than kept for logic it
  never had. The nurse's real rule — a referral is accepted only once a
  record already exists for its patient — is now the `Accept Only Known
  Patient` precondition on `Referral Case`'s `Accept Referral`
  (`models/clinic/src/workspace.ts:445-465`), naming `Referral Intake`'s
  `Accept Referral` front as the operation that fetched the summary
  (`models/clinic/src/workspace.ts:566-594`). `Accept Referral` on the
  aggregate is now `internal: true`, run by that front exactly as
  petstore's `OrderApp.ConfirmDelivery` fronts `Pet`'s internal
  `DeliverOrder` (decision 17). `domain-service-consumes-inside` no longer
  fires.
- **`Offer Slot`'s answer** (`returns` plus a `rejects` standing in for a
  second thing that happened) was a worked-around shape for an operation
  with no synchronous answer at all: the operation already raises both
  `Booking Confirmed` and `Patient Waitlisted`, so the `returns` and
  `rejects` were restating, in the wrong vocabulary, a fact the `raises`
  list already carried honestly. `Offer Slot` now names neither
  (`models/clinic/src/workspace.ts:770-775`); the interview text stands
  unchanged, since the compromise was in the model, not in what the
  scheduler said.

## Revision (card 126)

The referral's diagnosis code carried no relation, and a comment beside it
said why: a relation never crossed a bounded context, and `Clinical Code`
belongs to the regulator. The architect's twelfth round found the refusal
wrong — the rule told the author to hold the value's identity instead, which a
value object has none of, and the label and the multiplicity the map needs went
unsaid. A `uses` relation may now reach a value object wherever the borrowing
may (`cross-context-relation`, decision 14's note of 2026-09-10), so
`Referral`'s `diagnosisCode` declares one, `coded-as` at `0..1`
(`models/clinic/src/workspace.ts:425-433`). Triage's conformist relationship
with the regulator is what carries both the attribute and the relation; the
model still reports zero diagnostics.

## Revision (card 127)

The appointment lifecycle's deadline held a data-fixed date in `after`
("until the day of the appointment"), which decision 23's fifth note of
2026-09-10 named as a mistake: an interval counts from a trigger, and a
calendar date the record already holds has no home in one. The interview
gives no interval to count and no reason to invent one — "nothing, until
either the patient cancels, or the day of the appointment arrives" is a date
`Clinic Session` already states, not a duration. That rules out a Clock: a
Clock context is honest for a calendar boundary every context shares
(day-end, month-end), and this is a single booking's own session date, known
in advance and specific to the instance, not a shared tick. The honest shape
is the scheduled-operation reading decisions 23 (fourth amendment) and 28
(note of 2026-09-08, second) both give: the clinic's own scheduler calls
`Mark Appointment Day Reached` on `Booking` once a confirmed booking's
session date arrives with no cancellation received, and that operation
raises `Appointment Day Reached`, which the process ends on instead of a
deadline (`models/clinic/src/workspace.ts:767-840`). The model still reports
zero diagnostics.
