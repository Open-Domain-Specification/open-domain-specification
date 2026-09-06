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

- **An outbound call from a domain service.** The nurse's own account is
  that the assessment logic itself calls out to Records for the patient's
  known history — not an application service fronting the call. The model
  is honest about who calls: `Triage Assessment` (a domain service) consumes
  Records' `Get Patient Summary` directly
  (`models/clinic/src/workspace.ts:543-554`). `domain-service-consumes-inside`
  is expected and left standing on purpose; see the journal on
  `boards/project-backlog/117-a-fifth-model-written-blind-in-an-unfamiliar-domain.md`.
- **An operation that answers with two things that happened.** `Offer Slot`
  can genuinely come back two ways when the offered slot does not suit the
  patient — booked, or waitlisted — and neither is a refusal: something did
  happen either time. The model has one `returns` and no second "it
  happened, but not that" shape, so `Patient Waitlisted` is recorded under
  `rejects` for want of anywhere better to put it, even though nothing was
  refused. This is a compromise, not a claim that waitlisting is a refusal
  (`models/clinic/src/workspace.ts:751-759`).
- **The lab's own reference number.** The lab is an external context and
  the model does not know its internal shape, so the only thing recorded
  about a lab test in our own case is the lab's own order reference, held as
  an `identifies` attribute pointing at the Laboratory context itself, and
  the result once it is translated in.
